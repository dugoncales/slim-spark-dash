import { supabase } from "@/integrations/supabase/client";

export type Sexo = "masculino" | "feminino";

export type Participante = {
  id: string;
  numero: number;
  nome: string;
  altura: number | null;
  peso_inicial: number;
  imc_inicial: number;
  circunferencia_inicial: number | null;
  ativo: boolean;
  mes_inicio: string | null;
  grupo_id: string | null;
  sexo: Sexo | null;
};

/* ==================== Risco cardiovascular (circunferência abdominal) ==================== */

/** Limites WHO de circunferência abdominal (cm) para risco aumentado. */
export const LIMITE_CINTURA: Record<Sexo, number> = {
  masculino: 94,
  feminino: 80,
};

/** Aumento relativo do risco de angina por cm acima do limite (composto). */
export const ANGINA_PER_CM = 0.075;

/** Aumento absoluto do risco cardiovascular por cm acima do limite (média 3-4%). */
export const CV_PER_CM = 0.035;

/** cm acima do limite WHO. 0 quando sexo ausente ou circunferência ≤ limite. */
export function calcExcessoCintura(
  circ: number | null | undefined,
  sexo: Sexo | null | undefined,
): number {
  if (!sexo || circ == null) return 0;
  return Math.max(0, circ - LIMITE_CINTURA[sexo]);
}

/** Risco relativo de angina: (1,075)^excesso − 1. */
export function calcRiscoAngina(excesso: number): number {
  if (excesso <= 0) return 0;
  return Math.pow(1 + ANGINA_PER_CM, excesso) - 1;
}

/** Risco cardiovascular adicional: 3,5% × excesso (em proporção). */
export function calcRiscoCV(excesso: number): number {
  if (excesso <= 0) return 0;
  return CV_PER_CM * excesso;
}

export type RiscoParticipante = {
  /** Tem dados suficientes (sexo + alguma circunferência). */
  computavel: boolean;
  excessoInicial: number;
  excessoAtual: number;
  riscoAnginaInicial: number;
  riscoAnginaAtual: number;
  riscoCVInicial: number;
  riscoCVAtual: number;
  /** Atual − Inicial (negativo = melhora). */
  deltaAngina: number;
  deltaCV: number;
  deltaCintura: number;
  circInicial: number | null;
  circAtual: number | null;
};

/** Calcula risco para um participante usando circunferência_inicial vs última medição registrada. */
export function calcRiscoParticipante(
  p: Participante,
  medicoes: Medicao[],
): RiscoParticipante {
  const circInicial = p.circunferencia_inicial;
  const ultimas = medicoes
    .filter((m) => m.participante_id === p.id && m.circunferencia != null)
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));
  const circAtual = ultimas.length ? ultimas[ultimas.length - 1].circunferencia : circInicial;
  const computavel = !!p.sexo && (circInicial != null || circAtual != null);
  const exI = calcExcessoCintura(circInicial, p.sexo);
  const exA = calcExcessoCintura(circAtual, p.sexo);
  const ai = calcRiscoAngina(exI);
  const aa = calcRiscoAngina(exA);
  const ci = calcRiscoCV(exI);
  const ca = calcRiscoCV(exA);
  return {
    computavel,
    excessoInicial: exI,
    excessoAtual: exA,
    riscoAnginaInicial: ai,
    riscoAnginaAtual: aa,
    riscoCVInicial: ci,
    riscoCVAtual: ca,
    deltaAngina: aa - ai,
    deltaCV: ca - ci,
    deltaCintura: (circAtual ?? 0) - (circInicial ?? 0),
    circInicial,
    circAtual,
  };
}

export type RiscoMedioGrupo = {
  /** Participantes com sexo + alguma circunferência. */
  n: number;
  /** Participantes sem sexo ou sem circunferência. */
  semDados: number;
  riscoAnginaAtualMedio: number;
  riscoAnginaInicialMedio: number;
  riscoCVAtualMedio: number;
  riscoCVInicialMedio: number;
  deltaAnginaMedio: number;
  deltaCVMedio: number;
  excessoAtualMedio: number;
  /** % de participantes (computáveis) cujo risco caiu. */
  pctReduziuRisco: number;
  /** Detalhes por participante para rankings (apenas computáveis). */
  detalhes: Array<{ participante: Participante; risco: RiscoParticipante }>;
};

export function calcRiscoMedioGrupo(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): RiscoMedioGrupo {
  const baseParts = aplicarFiltroGrupos(
    coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes,
    grupoIds,
  );
  const detalhes: RiscoMedioGrupo["detalhes"] = [];
  let semDados = 0;
  baseParts.forEach((p) => {
    const r = calcRiscoParticipante(p, medicoes);
    if (!r.computavel) {
      semDados++;
      return;
    }
    detalhes.push({ participante: p, risco: r });
  });
  const n = detalhes.length || 1;
  const sum = (f: (d: (typeof detalhes)[number]) => number) =>
    detalhes.reduce((a, d) => a + f(d), 0);
  const reduziu = detalhes.filter((d) => d.risco.deltaAngina < 0).length;
  return {
    n: detalhes.length,
    semDados,
    riscoAnginaAtualMedio: sum((d) => d.risco.riscoAnginaAtual) / n,
    riscoAnginaInicialMedio: sum((d) => d.risco.riscoAnginaInicial) / n,
    riscoCVAtualMedio: sum((d) => d.risco.riscoCVAtual) / n,
    riscoCVInicialMedio: sum((d) => d.risco.riscoCVInicial) / n,
    deltaAnginaMedio: sum((d) => d.risco.deltaAngina) / n,
    deltaCVMedio: sum((d) => d.risco.deltaCV) / n,
    excessoAtualMedio: sum((d) => d.risco.excessoAtual) / n,
    pctReduziuRisco: detalhes.length ? (reduziu / detalhes.length) * 100 : 0,
    detalhes,
  };
}

export type Grupo = {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
};

/** Sentinela usada no filtro para representar "Sem grupo". */
export const SEM_GRUPO = "__sem_grupo__";

/**
 * Aplica o filtro de grupos a uma lista de participantes.
 * `grupoIds` vazio/null = sem filtro. Inclua `SEM_GRUPO` para casar `grupo_id === null`.
 */
export function aplicarFiltroGrupos<T extends { grupo_id: string | null }>(
  parts: T[],
  grupoIds?: string[] | null,
): T[] {
  if (!grupoIds || grupoIds.length === 0) return parts;
  const set = new Set(grupoIds);
  return parts.filter((p) =>
    p.grupo_id == null ? set.has(SEM_GRUPO) : set.has(p.grupo_id),
  );
}

export function calcImc(
  peso: number | null | undefined,
  altura: number | null | undefined,
): number | null {
  if (!peso || !altura || altura <= 0) return null;
  return Math.round((peso / (altura * altura)) * 100) / 100;
}

export type AtivFisicaIntensidade = "nao_pratica" | "leve" | "moderada" | "intensa";

export const ATIV_FISICA_LABEL: Record<AtivFisicaIntensidade, string> = {
  nao_pratica: "Não pratica",
  leve: "Leve",
  moderada: "Moderada",
  intensa: "Intensa",
};

export const ATIV_FISICA_COLOR: Record<AtivFisicaIntensidade, string> = {
  nao_pratica: "#94a3b8", // slate-400
  leve: "#fcd34d", // amber-300
  moderada: "#34d399", // emerald-400
  intensa: "#15803d", // emerald-700
};

export const NUTRI_FIELDS = [
  { key: "nutri_reduziu_acucar", label: "Reduziu açúcar" },
  { key: "nutri_reduziu_ultraprocessados", label: "Reduziu ultraprocessados" },
  { key: "nutri_aumentou_proteina", label: "Aumentou proteína" },
  { key: "nutri_aumentou_vegetais", label: "Aumentou vegetais" },
  { key: "nutri_controle_porcoes", label: "Controle de porções" },
  { key: "nutri_reduziu_alcool", label: "Reduziu álcool" },
] as const;

export type NutriField = (typeof NUTRI_FIELDS)[number]["key"];

export const ESPECIALIDADES = [
  { key: "endocrino", label: "Endócrino", realizadas: "consultas_endocrino", agendadas: "consultas_endocrino_agendadas" },
  { key: "nutri", label: "Nutricionista", realizadas: "consultas_nutri", agendadas: "consultas_nutri_agendadas" },
  { key: "psico", label: "Psicologia", realizadas: "consultas_psico", agendadas: "consultas_psico_agendadas" },
  { key: "edfisica", label: "Educação Física", realizadas: "consultas_edfisica", agendadas: "consultas_edfisica_agendadas" },
] as const;

export type Medicao = {
  id: string;
  participante_id: string;
  mes_referencia: string; // YYYY-MM-DD
  peso: number | null;
  imc: number | null;
  circunferencia: number | null;
  medicamento: string | null;
  dose: string | null;
  consultas_endocrino: number | null;
  consultas_nutri: number | null;
  consultas_psico: number | null;
  consultas_edfisica: number | null;
  consultas_endocrino_agendadas: number | null;
  consultas_nutri_agendadas: number | null;
  consultas_psico_agendadas: number | null;
  consultas_edfisica_agendadas: number | null;
  ativ_fisica_intensidade: AtivFisicaIntensidade | null;
  ativ_fisica_dias_semana: number | null;
  nutri_reduziu_acucar: boolean | null;
  nutri_reduziu_ultraprocessados: boolean | null;
  nutri_aumentou_proteina: boolean | null;
  nutri_aumentou_vegetais: boolean | null;
  nutri_controle_porcoes: boolean | null;
  nutri_reduziu_alcool: boolean | null;
  observacao: string | null;
};

/* ==================== Dose do Mounjaro ==================== */

/**
 * Normaliza a string de dose (ex.: "5,0mg", "7,5 mg", "10mg") em número (mg).
 * Retorna null quando não conseguir extrair um número.
 */
export function parseDoseMg(dose: string | null | undefined): number | null {
  if (!dose) return null;
  const match = dose.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Doses padrão do Mounjaro, ordenadas. */
export const DOSE_VALUES_MG = [2.5, 5, 7.5, 10, 12.5, 15] as const;

/**
 * Escala de cor por dose (claro = menor dose, escuro = maior dose).
 * Tons de roxo para destacar a dose sem competir com o verde do peso/IMC.
 */
export const DOSE_COLORS: Record<number, string> = {
  2.5: "#e9d5ff", // purple-200
  5: "#c084fc",   // purple-400
  7.5: "#9333ea", // purple-600
  10: "#6b21a8",  // purple-800
  12.5: "#4c1d95", // purple-900
  15: "#2e1065",  // purple-950
};

/** Cor para uma dose arbitrária (cai no tom mais próximo). */
export function doseColor(mg: number | null | undefined): string {
  if (mg == null) return "#94a3b8"; // slate-400 (sem dose)
  let best = DOSE_VALUES_MG[0] as number;
  let bestDelta = Math.abs(mg - best);
  for (const v of DOSE_VALUES_MG) {
    const d = Math.abs(mg - v);
    if (d < bestDelta) {
      best = v;
      bestDelta = d;
    }
  }
  return DOSE_COLORS[best] ?? "#94a3b8";
}

/** Label amigável em pt-BR: 2.5 → "2,5 mg". */
export function doseLabel(mg: number | null | undefined): string {
  if (mg == null) return "—";
  return `${mg.toString().replace(".", ",")} mg`;
}

/* ==================== Catálogo de medicamentos (canetas GLP-1/GIP) ==================== */

export type Medicamento = {
  /** Nome comercial padronizado (gravado em medicoes.medicamento). */
  nome: string;
  /** Princípio ativo, só para tooltip/legenda. */
  principio: string;
  /** Doses padrão em mg, na ordem de escalonamento. */
  doses: number[];
};

export const MEDICAMENTOS: Medicamento[] = [
  { nome: "Mounjaro", principio: "tirzepatida", doses: [2.5, 5, 7.5, 10, 12.5, 15] },
  { nome: "Ozempic", principio: "semaglutida", doses: [0.25, 0.5, 1.0, 2.0] },
  { nome: "Wegovy", principio: "semaglutida", doses: [0.25, 0.5, 1.0, 1.7, 2.4] },
  { nome: "Saxenda", principio: "liraglutida", doses: [0.6, 1.2, 1.8, 2.4, 3.0] },
  { nome: "Victoza", principio: "liraglutida", doses: [0.6, 1.2, 1.8] },
  { nome: "Trulicity", principio: "dulaglutida", doses: [0.75, 1.5, 3.0, 4.5] },
  { nome: "Rybelsus", principio: "semaglutida oral", doses: [3, 7, 14] },
];

/** String padronizada de dose (ex.: 2.5 → "2,5 mg"). Usada também como valor armazenado. */
export function formatDoseValue(mg: number): string {
  return `${mg.toString().replace(".", ",")} mg`;
}





export async function fetchAll() {
  const [p, m, g] = await Promise.all([
    supabase.from("participantes").select("*").order("numero"),
    supabase.from("medicoes").select("*").order("mes_referencia"),
    supabase.from("grupos").select("*").order("nome"),
  ]);
  if (p.error) throw p.error;
  if (m.error) throw m.error;
  if (g.error) throw g.error;
  return {
    participantes: (p.data ?? []) as Participante[],
    medicoes: (m.data ?? []) as Medicao[],
    grupos: (g.data ?? []) as Grupo[],
  };
}

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMes(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length < 2) return "";
  const [y, m] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = MESES_PT[monthIdx] ?? "";
  return `${monthName}/${y}`;
}

export function nomeOuNumero(p: Participante, mostrar: boolean) {
  return mostrar ? p.nome : `Pessoa ${p.numero}`;
}

export function mesesDistintosInicio(participantes: Participante[]): string[] {
  const s = new Set<string>();
  participantes.forEach((p) => {
    if (p.mes_inicio) s.add(p.mes_inicio);
  });
  return Array.from(s).sort();
}

export type EvolucaoMes = {
  mes: string;
  mesLabel: string;
  pesoMedio: number | null;
  imcMedio: number | null;
  circMedia: number | null;
  n: number;
};

export function calcEvolucaoGrupo(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): EvolucaoMes[] {
  const baseParts = aplicarFiltroGrupos(coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes, grupoIds);
  const ids = new Set(baseParts.map((p) => p.id));
  const inicioById = new Map(baseParts.map((p) => [p.id, p.mes_inicio] as const));
  const mesesSet = new Set<string>();
  medicoes.forEach((m) => {
    if (ids.has(m.participante_id)) mesesSet.add(m.mes_referencia);
  });
  const meses = Array.from(mesesSet).sort();

  return meses.map((mes) => {
    const ms = medicoes.filter(
      (m) =>
        m.mes_referencia === mes &&
        ids.has(m.participante_id) &&
        (inicioById.get(m.participante_id) ?? mes) <= mes,
    );
    const avg = (key: "peso" | "imc" | "circunferencia") => {
      const vals = ms.map((m) => m[key]).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      mes,
      mesLabel: formatMes(mes),
      pesoMedio: avg("peso"),
      imcMedio: avg("imc"),
      circMedia: avg("circunferencia"),
      n: ms.length,
    };
  });
}

/** Série isolada por grupo (para comparação lado a lado). */
export type EvolucaoSerieGrupo = {
  grupoId: string;
  nome: string;
  cor: string;
  dados: EvolucaoMes[];
};

const CORES_FALLBACK = ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#ef4444", "#14b8a6", "#eab308", "#ec4899"];

export function calcEvolucaoPorGrupo(
  participantes: Participante[],
  medicoes: Medicao[],
  grupos: Grupo[],
  grupoIds: string[],
  coorte?: string | null,
): EvolucaoSerieGrupo[] {
  return grupoIds.map((gid, i) => {
    const grupo = grupos.find((g) => g.id === gid);
    const nome = gid === SEM_GRUPO ? "Sem grupo" : (grupo?.nome ?? "Grupo");
    const cor = gid === SEM_GRUPO ? "#94a3b8" : (grupo?.cor ?? CORES_FALLBACK[i % CORES_FALLBACK.length]);
    return {
      grupoId: gid,
      nome,
      cor,
      dados: calcEvolucaoGrupo(participantes, medicoes, coorte, [gid]),
    };
  });
}

export type MarcosResumo = {
  atingiram5: number;
  atingiram10: number;
  total: number;
  perdaMediaAcumPct: number;
  /** Mediana do nº de meses (1º, 2º, …) em que pacientes cruzaram −5% pela 1ª vez. */
  mesesMedianos5: number | null;
  /** Mediana do nº de meses em que pacientes cruzaram −10% pela 1ª vez. */
  mesesMedianos10: number | null;
};

/**
 * Faixa de peso saudável (IMC 18.5–24.9 × altura²).
 * Retorna null se altura ausente/inválida.
 */
export function calcPesoIdealRange(
  altura: number | null | undefined,
): { min: number; max: number } | null {
  if (!altura || altura <= 0) return null;
  return {
    min: Math.round(18.5 * altura * altura * 10) / 10,
    max: Math.round(24.9 * altura * altura * 10) / 10,
  };
}

export type MedicaoSerie = {
  mes: string;
  mesLabel: string;
  peso: number | null;
  imc: number | null;
  circunferencia: number | null;
  /** Dose do Mounjaro em mg, quando registrada. */
  doseMg: number | null;
  /** Medicamento bruto (ex.: "Mounjaro"), para tooltips. */
  medicamento: string | null;
};

/**
 * Série temporal de um participante: ponto inicial (peso_inicial/imc_inicial/circ_inicial
 * em mes_inicio) + cada medição mensal ordenada. IMC ausente em uma medição é
 * recomputado a partir de peso + altura.
 */
export function serieParticipante(p: Participante, medicoes: Medicao[]): MedicaoSerie[] {
  const ms = medicoes
    .filter(
      (m) =>
        m.participante_id === p.id &&
        // Ignora medições anteriores ao mês de início do paciente
        // (defesa contra dados órfãos que distorcem o gráfico de evolução).
        (!p.mes_inicio || m.mes_referencia >= p.mes_inicio),
    )
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));

  const out: MedicaoSerie[] = [];
  if (p.mes_inicio) {
    // Se houver uma medição registrada já no mês de início, traz a dose/medicamento
    // dela para o ponto "Inicial" do gráfico (caso contrário fica null).
    const mInicio = ms.find((m) => m.mes_referencia === p.mes_inicio);
    out.push({
      mes: p.mes_inicio,
      mesLabel: formatMes(p.mes_inicio),
      peso: p.peso_inicial ?? null,
      imc: p.imc_inicial ?? calcImc(p.peso_inicial, p.altura),
      circunferencia: p.circunferencia_inicial ?? null,
      doseMg: parseDoseMg(mInicio?.dose),
      medicamento: mInicio?.medicamento ?? null,
    });
  }
  ms.forEach((m) => {
    // Evita duplicar o mês inicial caso haja medicao no mesmo mes_inicio
    if (p.mes_inicio && m.mes_referencia === p.mes_inicio) return;
    out.push({
      mes: m.mes_referencia,
      mesLabel: formatMes(m.mes_referencia),
      peso: m.peso,
      imc: m.imc ?? calcImc(m.peso, p.altura),
      circunferencia: m.circunferencia,
      doseMg: parseDoseMg(m.dose),
      medicamento: m.medicamento,
    });
  });
  return out;
}


export function rotuloMesRelativo(idx: number): string {
  if (idx === 0) return "Inicial";
  const ordinais = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º", "11º", "12º"];
  return `${ordinais[idx - 1] ?? `${idx}º`} Mês`;
}

export function calcMarcos(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): MarcosResumo {
  const baseParts = aplicarFiltroGrupos(coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes, grupoIds);
  let atingiram5 = 0,
    atingiram10 = 0,
    somaPct = 0,
    total = 0;
  const tempos5: number[] = [];
  const tempos10: number[] = [];
  baseParts.forEach((p) => {
    const ms = medicoes
      .filter(
        (m) =>
          m.participante_id === p.id &&
          m.peso != null &&
          (!p.mes_inicio || m.mes_referencia > p.mes_inicio),
      )
      .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));
    const ultima = ms[ms.length - 1];
    if (!ultima || !p.peso_inicial) return;
    const perdaPct = ((ultima.peso! - p.peso_inicial) / p.peso_inicial) * 100;
    total += 1;
    somaPct += perdaPct;
    if (perdaPct <= -5) atingiram5 += 1;
    if (perdaPct <= -10) atingiram10 += 1;
    // Tempo (em nº de meses pós-início) da 1ª vez que cada limiar foi cruzado.
    for (let i = 0; i < ms.length; i++) {
      const pct = ((ms[i].peso! - p.peso_inicial) / p.peso_inicial) * 100;
      if (pct <= -5 && !tempos5.includes(-1)) {
        tempos5.push(i + 1);
        break;
      }
    }
    for (let i = 0; i < ms.length; i++) {
      const pct = ((ms[i].peso! - p.peso_inicial) / p.peso_inicial) * 100;
      if (pct <= -10) {
        tempos10.push(i + 1);
        break;
      }
    }
  });
  const mediana = (arr: number[]): number | null => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  return {
    atingiram5,
    atingiram10,
    total,
    perdaMediaAcumPct: total ? somaPct / total : 0,
    mesesMedianos5: mediana(tempos5),
    mesesMedianos10: mediana(tempos10),
  };
}

/* ==================== Adesão multidisciplinar ==================== */

export type EvolucaoAtividadeFisicaMes = {
  mes: string;
  mesLabel: string;
  /** % de pacientes em cada faixa de intensidade (somam ~100) */
  pctNaoPratica: number;
  pctLeve: number;
  pctModerada: number;
  pctIntensa: number;
  /** Média de dias/semana entre quem registrou (excluindo nulls) */
  diasMedia: number | null;
  n: number;
};

export function calcEvolucaoAtividadeFisica(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): EvolucaoAtividadeFisicaMes[] {
  const baseParts = aplicarFiltroGrupos(coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes, grupoIds);
  const ids = new Set(baseParts.map((p) => p.id));
  const mesesSet = new Set<string>();
  medicoes.forEach((m) => { if (ids.has(m.participante_id)) mesesSet.add(m.mes_referencia); });
  const meses = Array.from(mesesSet).sort();

  return meses.map((mes) => {
    const ms = medicoes.filter(
      (m) => m.mes_referencia === mes && ids.has(m.participante_id) && m.ativ_fisica_intensidade != null,
    );
    const n = ms.length;
    const count = (k: AtivFisicaIntensidade) => ms.filter((m) => m.ativ_fisica_intensidade === k).length;
    const pct = (k: AtivFisicaIntensidade) => (n ? (count(k) / n) * 100 : 0);
    const dias = ms.map((m) => m.ativ_fisica_dias_semana).filter((d): d is number => d != null);
    return {
      mes,
      mesLabel: formatMes(mes),
      pctNaoPratica: pct("nao_pratica"),
      pctLeve: pct("leve"),
      pctModerada: pct("moderada"),
      pctIntensa: pct("intensa"),
      diasMedia: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
      n,
    };
  });
}

export type EvolucaoNutricaoMes = {
  mes: string;
  mesLabel: string;
  n: number;
} & Record<NutriField, number>; // % de pacientes que marcaram cada item

export function calcEvolucaoNutricao(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): EvolucaoNutricaoMes[] {
  const baseParts = aplicarFiltroGrupos(coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes, grupoIds);
  const ids = new Set(baseParts.map((p) => p.id));
  const mesesSet = new Set<string>();
  medicoes.forEach((m) => { if (ids.has(m.participante_id)) mesesSet.add(m.mes_referencia); });
  const meses = Array.from(mesesSet).sort();

  return meses.map((mes) => {
    const ms = medicoes.filter((m) => m.mes_referencia === mes && ids.has(m.participante_id));
    const n = ms.length;
    const row: EvolucaoNutricaoMes = {
      mes,
      mesLabel: formatMes(mes),
      n,
      nutri_reduziu_acucar: 0,
      nutri_reduziu_ultraprocessados: 0,
      nutri_aumentou_proteina: 0,
      nutri_aumentou_vegetais: 0,
      nutri_controle_porcoes: 0,
      nutri_reduziu_alcool: 0,
    };
    if (!n) return row;
    NUTRI_FIELDS.forEach((f) => {
      const c = ms.filter((m) => m[f.key] === true).length;
      row[f.key] = (c / n) * 100;
    });
    return row;
  });
}

export type EvolucaoAderenciaConsultasMes = {
  mes: string;
  mesLabel: string;
  /** % de adesão por especialidade: realizadas / agendadas (apenas quando agendadas > 0) */
  endocrino: number | null;
  nutri: number | null;
  psico: number | null;
  edfisica: number | null;
  /** Média global das 4 (ignora null) */
  media: number | null;
};

export function calcEvolucaoAderenciaConsultas(
  participantes: Participante[],
  medicoes: Medicao[],
  coorte?: string | null,
  grupoIds?: string[] | null,
): EvolucaoAderenciaConsultasMes[] {
  const baseParts = aplicarFiltroGrupos(coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes, grupoIds);
  const ids = new Set(baseParts.map((p) => p.id));
  const mesesSet = new Set<string>();
  medicoes.forEach((m) => { if (ids.has(m.participante_id)) mesesSet.add(m.mes_referencia); });
  const meses = Array.from(mesesSet).sort();

  return meses.map((mes) => {
    const ms = medicoes.filter((m) => m.mes_referencia === mes && ids.has(m.participante_id));
    const pctEsp = (real: keyof Medicao, agen: keyof Medicao): number | null => {
      let r = 0, a = 0;
      ms.forEach((m) => {
        const ag = (m[agen] as number | null) ?? 0;
        const rl = (m[real] as number | null) ?? 0;
        if (ag > 0) { a += ag; r += Math.min(rl, ag); }
      });
      return a > 0 ? (r / a) * 100 : null;
    };
    const endocrino = pctEsp("consultas_endocrino", "consultas_endocrino_agendadas");
    const nutri = pctEsp("consultas_nutri", "consultas_nutri_agendadas");
    const psico = pctEsp("consultas_psico", "consultas_psico_agendadas");
    const edfisica = pctEsp("consultas_edfisica", "consultas_edfisica_agendadas");
    const vals = [endocrino, nutri, psico, edfisica].filter((v): v is number => v != null);
    const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { mes, mesLabel: formatMes(mes), endocrino, nutri, psico, edfisica, media };
  });
}

export function calcAderenciaConsultas(m: Medicao) {
  const ag = (m.consultas_endocrino_agendadas ?? 0) + (m.consultas_nutri_agendadas ?? 0)
    + (m.consultas_psico_agendadas ?? 0) + (m.consultas_edfisica_agendadas ?? 0);
  const rl = Math.min((m.consultas_endocrino ?? 0), m.consultas_endocrino_agendadas ?? 0)
    + Math.min((m.consultas_nutri ?? 0), m.consultas_nutri_agendadas ?? 0)
    + Math.min((m.consultas_psico ?? 0), m.consultas_psico_agendadas ?? 0)
    + Math.min((m.consultas_edfisica ?? 0), m.consultas_edfisica_agendadas ?? 0);
  return { agendadas: ag, realizadas: rl, pct: ag > 0 ? (rl / ag) * 100 : null };
}

