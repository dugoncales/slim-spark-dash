import type { Medicao, Participante, Sexo } from "@/lib/dashboard-data";

/* ==================== Exames laboratoriais / indicadores secundários ==================== */

export type ExameKey =
  | "glicemia_jejum"
  | "hba1c"
  | "colesterol_total"
  | "hdl"
  | "ldl"
  | "triglicerideos"
  | "pa_sistolica"
  | "pa_diastolica";

export type ExameCategoria = "glicemico" | "lipidico" | "pressao";

export type ExameStatus = "normal" | "alterado";
export type ExameMelhora = "melhorou" | "piorou" | "estavel";

export type ExameMeta = {
  key: ExameKey;
  label: string;
  short: string;
  unidade: string;
  categoria: ExameCategoria;
  /** Direção "boa" para o indicador (menor é melhor exceto HDL). */
  desejado: "menor" | "maior";
  /** step do input numérico. */
  step: number;
  /** Descrição do critério de melhora (para tooltip). */
  descricaoMelhora: string;
};

export const EXAMES_META: ReadonlyArray<ExameMeta> = [
  {
    key: "glicemia_jejum",
    label: "Glicemia de jejum",
    short: "Glicemia",
    unidade: "mg/dL",
    categoria: "glicemico",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 10 mg/dL ou saída da faixa alterada (≥100 mg/dL)",
  },
  {
    key: "hba1c",
    label: "Hemoglobina glicada (HbA1c)",
    short: "HbA1c",
    unidade: "%",
    categoria: "glicemico",
    desejado: "menor",
    step: 0.1,
    descricaoMelhora: "Redução ≥ 0,5 pp ou saída da faixa alterada (≥5,7%)",
  },
  {
    key: "colesterol_total",
    label: "Colesterol total",
    short: "Colesterol",
    unidade: "mg/dL",
    categoria: "lipidico",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 10% ou saída da faixa alterada (≥200 mg/dL)",
  },
  {
    key: "hdl",
    label: "HDL (colesterol bom)",
    short: "HDL",
    unidade: "mg/dL",
    categoria: "lipidico",
    desejado: "maior",
    step: 1,
    descricaoMelhora: "Aumento ≥ 5 mg/dL ou entrada na faixa saudável (H≥40, M≥50)",
  },
  {
    key: "ldl",
    label: "LDL (colesterol ruim)",
    short: "LDL",
    unidade: "mg/dL",
    categoria: "lipidico",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 10% ou saída da faixa alterada (≥130 mg/dL)",
  },
  {
    key: "triglicerideos",
    label: "Triglicerídeos",
    short: "Triglic.",
    unidade: "mg/dL",
    categoria: "lipidico",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 15% ou saída da faixa alterada (≥150 mg/dL)",
  },
  {
    key: "pa_sistolica",
    label: "PA sistólica",
    short: "PAS",
    unidade: "mmHg",
    categoria: "pressao",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 5 mmHg ou saída da faixa alterada (≥130 mmHg)",
  },
  {
    key: "pa_diastolica",
    label: "PA diastólica",
    short: "PAD",
    unidade: "mmHg",
    categoria: "pressao",
    desejado: "menor",
    step: 1,
    descricaoMelhora: "Redução ≥ 5 mmHg ou saída da faixa alterada (≥85 mmHg)",
  },
];

export const EXAME_KEYS: ExameKey[] = EXAMES_META.map((e) => e.key);

export const CATEGORIA_LABEL: Record<ExameCategoria, string> = {
  glicemico: "Perfil glicêmico",
  lipidico: "Perfil lipídico",
  pressao: "Pressão arterial",
};

export function getExameMeta(key: ExameKey): ExameMeta {
  return EXAMES_META.find((e) => e.key === key)!;
}

/** Classifica um valor pontual como normal ou alterado. HDL depende de sexo. */
export function classificaExame(
  key: ExameKey,
  valor: number | null | undefined,
  sexo?: Sexo | null,
): ExameStatus | null {
  if (valor == null || !Number.isFinite(valor)) return null;
  switch (key) {
    case "glicemia_jejum":
      return valor >= 100 ? "alterado" : "normal";
    case "hba1c":
      return valor >= 5.7 ? "alterado" : "normal";
    case "colesterol_total":
      return valor >= 200 ? "alterado" : "normal";
    case "ldl":
      return valor >= 130 ? "alterado" : "normal";
    case "hdl": {
      const limite = sexo === "feminino" ? 50 : 40;
      return valor < limite ? "alterado" : "normal";
    }
    case "triglicerideos":
      return valor >= 150 ? "alterado" : "normal";
    case "pa_sistolica":
      return valor >= 130 ? "alterado" : "normal";
    case "pa_diastolica":
      return valor >= 85 ? "alterado" : "normal";
  }
}

/**
 * Avalia melhora combinada: saída de faixa alterada OU redução clinicamente
 * relevante. Retorna null se faltarem dados.
 */
export function avaliaMelhora(
  key: ExameKey,
  inicial: number | null | undefined,
  atual: number | null | undefined,
  sexo?: Sexo | null,
): ExameMelhora | null {
  if (inicial == null || atual == null) return null;
  if (!Number.isFinite(inicial) || !Number.isFinite(atual)) return null;
  const statusInicial = classificaExame(key, inicial, sexo);
  const statusAtual = classificaExame(key, atual, sexo);

  // Sinal desejado: para "menor" queremos delta negativo; para "maior" (HDL) queremos delta positivo.
  const delta = atual - inicial;
  const meta = getExameMeta(key);

  // 1) Saída da faixa alterada.
  if (statusInicial === "alterado" && statusAtual === "normal") return "melhorou";
  if (statusInicial === "normal" && statusAtual === "alterado") return "piorou";

  // 2) Magnitude clínica (mesmo dentro da mesma faixa).
  const melhorouPorMagnitude = (() => {
    switch (key) {
      case "glicemia_jejum":
        return delta <= -10;
      case "hba1c":
        return delta <= -0.5;
      case "colesterol_total":
        return delta / inicial <= -0.10;
      case "ldl":
        return delta / inicial <= -0.10;
      case "hdl":
        return delta >= 5;
      case "triglicerideos":
        return delta / inicial <= -0.15;
      case "pa_sistolica":
        return delta <= -5;
      case "pa_diastolica":
        return delta <= -5;
    }
  })();
  const piorouPorMagnitude = (() => {
    switch (key) {
      case "glicemia_jejum":
        return delta >= 10;
      case "hba1c":
        return delta >= 0.5;
      case "colesterol_total":
        return delta / inicial >= 0.10;
      case "ldl":
        return delta / inicial >= 0.10;
      case "hdl":
        return delta <= -5;
      case "triglicerideos":
        return delta / inicial >= 0.15;
      case "pa_sistolica":
        return delta >= 5;
      case "pa_diastolica":
        return delta >= 5;
    }
  })();

  if (melhorouPorMagnitude) return "melhorou";
  if (piorouPorMagnitude) return "piorou";
  void meta; // reservado para uso futuro
  return "estavel";
}

export type ExameResultado = {
  key: ExameKey;
  inicial: number | null;
  atual: number | null;
  delta: number | null;
  deltaPct: number | null;
  statusInicial: ExameStatus | null;
  statusAtual: ExameStatus | null;
  melhora: ExameMelhora | null;
  /** série cronológica {mes, valor} para sparkline. */
  serie: Array<{ mes: string; valor: number }>;
};

export type ExamesParticipante = {
  temAlgum: boolean;
  porExame: Record<ExameKey, ExameResultado>;
};

/**
 * Calcula, por indicador, o valor inicial (1ª medição registrada), o valor
 * atual (última medição registrada) e a série cronológica.
 */
export function calcExamesParticipante(
  p: Participante,
  medicoes: Medicao[],
): ExamesParticipante {
  const ordenadas = medicoes
    .filter((m) => m.participante_id === p.id)
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));

  const porExame = {} as Record<ExameKey, ExameResultado>;
  let temAlgum = false;

  for (const meta of EXAMES_META) {
    const serie: Array<{ mes: string; valor: number }> = [];
    for (const m of ordenadas) {
      const v = (m as unknown as Record<string, unknown>)[meta.key];
      if (v == null) continue;
      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (!Number.isFinite(num)) continue;
      serie.push({ mes: m.mes_referencia, valor: num });
    }
    const inicial = serie.length ? serie[0].valor : null;
    const atual = serie.length ? serie[serie.length - 1].valor : null;
    const delta = inicial != null && atual != null ? atual - inicial : null;
    const deltaPct = inicial != null && atual != null && inicial !== 0 ? delta! / inicial : null;
    const statusInicial = classificaExame(meta.key, inicial, p.sexo);
    const statusAtual = classificaExame(meta.key, atual, p.sexo);
    const melhora = serie.length >= 2 ? avaliaMelhora(meta.key, inicial, atual, p.sexo) : null;
    if (serie.length > 0) temAlgum = true;
    porExame[meta.key] = {
      key: meta.key,
      inicial,
      atual,
      delta,
      deltaPct,
      statusInicial,
      statusAtual,
      melhora,
      serie,
    };
  }

  return { temAlgum, porExame };
}

export type CategoriaResumo = {
  categoria: ExameCategoria;
  /** participantes com ≥2 medições em pelo menos um indicador da categoria. */
  avaliaveis: number;
  /** dos avaliáveis, quantos melhoraram em pelo menos um indicador da categoria. */
  melhoraram: number;
  /** e quantos pioraram em pelo menos um indicador. */
  pioraram: number;
  pctMelhora: number;
};

export type ExamesGrupo = {
  /** participantes com ao menos uma medição de qualquer exame. */
  cobertura: number;
  totalParticipantes: number;
  porCategoria: Record<ExameCategoria, CategoriaResumo>;
  /** para ranking: participantes que melhoraram, com score = # de indicadores que melhoraram. */
  detalhes: Array<{
    participante: Participante;
    exames: ExamesParticipante;
    scoreMelhora: number;
    scorePiora: number;
  }>;
};

/** % que melhorou em pelo menos um indicador da categoria. */
export function calcExamesGrupo(
  participantes: Participante[],
  medicoes: Medicao[],
): ExamesGrupo {
  const categorias: ExameCategoria[] = ["glicemico", "lipidico", "pressao"];
  const detalhes: ExamesGrupo["detalhes"] = [];
  let cobertura = 0;

  const catMap = {} as Record<ExameCategoria, { avaliaveis: number; melhoraram: number; pioraram: number }>;
  for (const c of categorias) catMap[c] = { avaliaveis: 0, melhoraram: 0, pioraram: 0 };

  for (const p of participantes) {
    const ex = calcExamesParticipante(p, medicoes);
    if (ex.temAlgum) cobertura++;
    let scoreMelhora = 0;
    let scorePiora = 0;
    for (const c of categorias) {
      const examesCat = EXAMES_META.filter((m) => m.categoria === c).map((m) => ex.porExame[m.key]);
      const avaliaveis = examesCat.some((r) => r.melhora != null);
      if (avaliaveis) catMap[c].avaliaveis++;
      const melhorou = examesCat.some((r) => r.melhora === "melhorou");
      const piorou = examesCat.some((r) => r.melhora === "piorou");
      if (melhorou) {
        catMap[c].melhoraram++;
        scoreMelhora += examesCat.filter((r) => r.melhora === "melhorou").length;
      }
      if (piorou) {
        catMap[c].pioraram++;
        scorePiora += examesCat.filter((r) => r.melhora === "piorou").length;
      }
    }
    detalhes.push({ participante: p, exames: ex, scoreMelhora, scorePiora });
  }

  const porCategoria = {} as Record<ExameCategoria, CategoriaResumo>;
  for (const c of categorias) {
    const { avaliaveis, melhoraram, pioraram } = catMap[c];
    porCategoria[c] = {
      categoria: c,
      avaliaveis,
      melhoraram,
      pioraram,
      pctMelhora: avaliaveis > 0 ? (melhoraram / avaliaveis) * 100 : 0,
    };
  }

  return {
    cobertura,
    totalParticipantes: participantes.length,
    porCategoria,
    detalhes,
  };
}
