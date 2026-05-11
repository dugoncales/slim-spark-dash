import { supabase } from "@/integrations/supabase/client";

export type Participante = {
  id: string;
  numero: number;
  nome: string;
  peso_inicial: number;
  imc_inicial: number;
  circunferencia_inicial: number | null;
  ativo: boolean;
};

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
