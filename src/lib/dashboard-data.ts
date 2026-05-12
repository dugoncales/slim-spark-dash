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

export function calcImc(peso: number | null | undefined, altura: number | null | undefined): number | null {
  if (!peso || !altura || altura <= 0) return null;
  return Math.round((peso / (altura * altura)) * 100) / 100;
}

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
  observacao: string | null;
};

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
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function formatMes(iso: string) {
  const [y, m] = iso.split("-");
  return `${MESES_PT[parseInt(m, 10) - 1]}/${y}`;
}

export function nomeOuNumero(p: Participante, mostrar: boolean) {
  return mostrar ? p.nome : `Pessoa ${p.numero}`;
}

export function mesesDistintosInicio(participantes: Participante[]): string[] {
  const s = new Set<string>();
  participantes.forEach(p => { if (p.mes_inicio) s.add(p.mes_inicio); });
  return Array.from(s).sort();
}

export type EvolucaoMes = { mes: string; mesLabel: string; pesoMedio: number | null; imcMedio: number | null; circMedia: number | null; n: number };

export function calcEvolucaoGrupo(participantes: Participante[], medicoes: Medicao[], coorte?: string | null): EvolucaoMes[] {
  const baseParts = coorte ? participantes.filter(p => p.mes_inicio === coorte) : participantes;
  const ids = new Set(baseParts.map(p => p.id));
  const inicioById = new Map(baseParts.map(p => [p.id, p.mes_inicio] as const));
  const mesesSet = new Set<string>();
  medicoes.forEach(m => { if (ids.has(m.participante_id)) mesesSet.add(m.mes_referencia); });
  const meses = Array.from(mesesSet).sort();

  return meses.map(mes => {
    const ms = medicoes.filter(m => m.mes_referencia === mes && ids.has(m.participante_id) && (inicioById.get(m.participante_id) ?? mes) <= mes);
    const avg = (key: "peso" | "imc" | "circunferencia") => {
      const vals = ms.map(m => m[key]).filter((v): v is number => v != null);
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

export type MarcosResumo = { atingiram5: number; atingiram10: number; total: number; perdaMediaAcumPct: number };

export function calcMarcos(participantes: Participante[], medicoes: Medicao[], coorte?: string | null): MarcosResumo {
  const baseParts = coorte ? participantes.filter(p => p.mes_inicio === coorte) : participantes;
  let atingiram5 = 0, atingiram10 = 0, somaPct = 0, total = 0;
  baseParts.forEach(p => {
    const ms = medicoes
      .filter(m => m.participante_id === p.id && m.peso != null && (!p.mes_inicio || m.mes_referencia > p.mes_inicio))
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
}
