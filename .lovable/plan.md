# Melhorias do Dashboard

Três melhorias no dashboard principal (`/`), todas em frontend — sem mudanças no banco.

## 1. Filtro por coorte (mês de início)

Novo seletor "Coorte de início" no topo do dashboard, ao lado do seletor de mês:
- Opções: "Todas as coortes" (padrão) + uma opção por `mes_inicio` distinto encontrado nos participantes (ex: "Iniciaram em Março/2025").
- Quando uma coorte é selecionada, **todos** os blocos passam a considerar apenas pacientes daquela coorte: KPIs, tabela, gráficos comparativos, insights, top 3, resumo, abas (circunferência, tratamento, consultas) e o novo gráfico de evolução temporal.
- Persiste em `localStorage` igual ao toggle "Mostrar nomes".

## 2. Evolução temporal do grupo (gráfico de linha)

Novo card "Evolução do grupo ao longo dos meses" abaixo dos dois gráficos comparativos existentes.
- Eixo X: todos os meses disponíveis (`meses`).
- Três linhas: **Peso médio (kg)**, **IMC médio (kg/m²)** e **Circunferência média (cm)** — usando eixos Y duplos (peso/circ à esquerda, IMC à direita) para escalas coexistirem.
- Para cada mês, calcula a média **apenas dos pacientes que já tinham iniciado** (i.e. `mes_inicio <= mes_referencia`) e, se filtro de coorte ativo, restringe a essa coorte.
- Tooltip mostra n (quantos pacientes contribuíram para a média naquele mês).
- Usa `recharts` (já instalado via `@/components/ui/chart`).

## 3. Marcos clínicos 5% e 10% de perda

Nova faixa de KPIs entre o grid atual e a tabela, com 3 cards destacados:
- **Atingiram ≥ 5% de perda**: contagem + % do total da coorte/grupo (5% é marco clínico de eficácia em obesidade).
- **Atingiram ≥ 10% de perda**: contagem + % (marco de impacto metabólico significativo).
- **Perda média acumulada do grupo**: % médio desde o `peso_inicial` de cada paciente até a medição mais recente disponível (não só do mês selecionado) — dá a visão de longo prazo que falta hoje.

Cada card terá ícone (Trophy/Target/TrendingDown) e cor de destaque (success quando metas batidas).

## Detalhes técnicos

- Arquivos: `src/routes/index.tsx` (filtro, KPIs novos, novo gráfico), novo componente `src/components/dashboard/EvolucaoChart.tsx`.
- Novo helper em `src/lib/dashboard-data.ts`: `mesesDistintosInicio(participantes)` e `calcEvolucaoGrupo(participantes, medicoes, coorte?)` que retorna `{ mes, pesoMedio, imcMedio, circMedia, n }[]`.
- Para "perda acumulada": pega a última medição (maior `mes_referencia`) de cada paciente e compara com `peso_inicial`. Pacientes sem medição posterior ao início são desconsiderados.
- Marcos 5%/10% usam essa mesma lógica acumulada (não só do mês selecionado) — mais relevante clinicamente.
- Sem migrations, sem novas dependências.
