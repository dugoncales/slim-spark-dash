## Objetivo
Deixar explícito, nos cards de "Marcos clínicos" do dashboard (`/`), que o marco de **≥ 5% de perda** é a referência clínica esperada **em ~3 meses** e o de **≥ 10%** **em ~6 meses**.

## Mudanças

### 1. `src/lib/dashboard-data.ts` — `calcMarcos`
Estender `MarcosResumo` com dois campos adicionais (mês relativo desde `mes_inicio` em que cada paciente cruzou o limiar pela primeira vez, agregado como mediana):

- `mesesMedianos5: number | null`
- `mesesMedianos10: number | null`

Para cada paciente da coorte, percorrer as medições ordenadas e registrar o índice (1º, 2º, … mês) da primeira em que `perdaPct ≤ -5` / `≤ -10`. A mediana dessas posições alimenta os campos novos. Sem mudança de schema.

Bônus: remover a linha duplicada de `return` ao final de `calcMarcos` (linhas 372–373).

### 2. `src/routes/index.tsx` — cards de marcos (linhas 390–450)
Adicionar a referência de tempo no subtítulo de cada card:

- Card "≥ 5%": acrescentar **"meta clínica em ~3 meses"** e, quando `mesesMedianos5` existir, anexar **"· mediana observada: Xº mês"**.
- Card "≥ 10%": acrescentar **"meta clínica em ~6 meses"** e, quando `mesesMedianos10` existir, anexar **"· mediana observada: Xº mês"**.
- Card "Perda média acumulada": manter como está.

Sem mudar layout, ícones ou cores — apenas texto auxiliar.

## Fora do escopo
- Página `/paciente/$id`, gráficos, exportação.
- Banco de dados / migrations.
