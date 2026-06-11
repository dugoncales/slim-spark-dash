## Parte 1 — Excluir dados de março/2025 (também corrige o bug do gráfico)

Há 11 medições em `medicoes` com `mes_referencia = 2025-03-01`. Entre elas está a do participante 3 (David, `mes_inicio = 2026-03-01`), com peso 110,9 kg. Como o gráfico ordena por `mes_referencia`, esse registro órfão entra antes do `mes_inicio` e vira "1º Mês" no tooltip — daí o peso 110,9 aparecer "duas vezes" (no falso 1º e no real 2º mês).

Ações:
- Migration `DELETE FROM medicoes WHERE mes_referencia = '2025-03-01'` (11 linhas, nenhum participante afetado).
- Endurecer `serieParticipante` em `src/lib/dashboard-data.ts`: ignorar medições com `mes_referencia < mes_inicio` (defesa em profundidade caso alguém volte a importar dados anteriores ao início do paciente).
- Após o delete, validar com query e recarregar o dashboard para confirmar que o tooltip volta a mostrar Inicial + 1º…4º Mês corretamente.

## Parte 2 — Visualização da dose do Mounjaro nos gráficos

Defaults assumidos (peça ajuste se quiser outra forma).

### 2.1 Parser de dose (cliente, sem alterar banco)
Em `src/lib/dashboard-data.ts`:
- `parseDoseMg(dose: string | null): number | null` — normaliza `"2,5 mg"`, `"5,0mg"`, `"7,5mg"`, `"10mg"` → `2.5 | 5 | 7.5 | 10`.
- `DOSE_COLORS` (escala clara → escura para 2,5 / 5 / 7,5 / 10 mg).
- `doseLabel(mg)` → `"2,5 mg"`.

### 2.2 Página do paciente (`/paciente/$id`)
- Adicionar segundo eixo Y (0–15 mg) na curva de peso, com linha em degrau (step) da dose.
- Pontos da curva de peso coloridos pela dose vigente.
- Tooltip mostra peso, IMC e dose do mês.

### 2.3 Dashboard — `MultiMonthBarChart`
- Badge pequeno acima de cada barra com a dose em mg (ex.: "5"), cor segue `DOSE_COLORS`.
- Legenda de doses abaixo do gráfico.

### 2.4 Novo card "Resposta por dose" no dashboard
- ScatterChart (recharts): X = dose (2,5 / 5 / 7,5 / 10 mg), Y = Δ peso (kg) do mês com aquela dose vs. mês anterior do mesmo paciente.
- KPI ao lado: média de Δpeso por dose.

## Notas técnicas
- Sem mudança de schema; apenas migration de DELETE.
- Strings de dose preservadas no banco; tudo via parser no cliente.
- Reaproveita `recharts` já instalado.