import { supabase } from "@/integrations/supabase/client";

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
};

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





export async function fetchAll() {
  const [p, m] = await Promise.all([
    supabase.from("participantes").select("*").order("numero"),
    supabase.from("medicoes").select("*").order("mes_referencia"),
  ]);
  if (p.error) throw p.error;
  if (m.error) throw m.error;
  return { participantes: (p.data ?? []) as Participante[], medicoes: (m.data ?? []) as Medicao[] };
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
): EvolucaoMes[] {
  const baseParts = coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes;
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

export type MarcosResumo = {
  atingiram5: number;
  atingiram10: number;
  total: number;
  perdaMediaAcumPct: number;
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
    out.push({
      mes: p.mes_inicio,
      mesLabel: formatMes(p.mes_inicio),
      peso: p.peso_inicial ?? null,
      imc: p.imc_inicial ?? calcImc(p.peso_inicial, p.altura),
      circunferencia: p.circunferencia_inicial ?? null,
      doseMg: null,
      medicamento: null,
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
): MarcosResumo {
  const baseParts = coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes;
  let atingiram5 = 0,
    atingiram10 = 0,
    somaPct = 0,
    total = 0;
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
  });
  return { atingiram5, atingiram10, total, perdaMediaAcumPct: total ? somaPct / total : 0 };
  return { atingiram5, atingiram10, total, perdaMediaAcumPct: total ? somaPct / total : 0 };
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
): EvolucaoAtividadeFisicaMes[] {
  const baseParts = coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes;
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
): EvolucaoNutricaoMes[] {
  const baseParts = coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes;
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
): EvolucaoAderenciaConsultasMes[] {
  const baseParts = coorte ? participantes.filter((p) => p.mes_inicio === coorte) : participantes;
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

