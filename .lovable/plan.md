## Objetivo

Permitir registrar o **mês de início individual** de cada participante (cada paciente entra em momentos diferentes no programa) e usar essa informação para:
1. Filtrar a lista do Cadastro inicial por mês de entrada.
2. **Excluir do cálculo de perda de peso** do Acompanhamento mensal os pacientes que iniciaram exatamente no mês selecionado (ainda não há comparação a fazer).

## Mudanças

### 1. Banco de dados
- Adicionar coluna `mes_inicio` (`date`, nullable) à tabela `participantes`.
- Backfill: para participantes existentes sem valor, usar a data da primeira `medicao` daquele participante; se não houver, usar o `mes_inicio` global da tabela `configuracoes`.

### 2. Cadastro inicial (`/gestao` → aba Cadastro inicial)
- **Adicionar participante**: novo campo `Mês de início` (input `month`), obrigatório. Default = mês atual.
- **Tabela editável**: nova coluna `Mês início` (input `month`) editável por linha; entra no fluxo de `salvarEdicoes`.
- **Filtro**: novo seletor "Filtrar por mês de início" (Todos / lista de meses distintos) acima da tabela.
- O card global "Mês de início do acompanhamento" continua existindo como **default** sugerido para novos cadastros, mas não substitui o valor por participante.

### 3. Acompanhamento mensal (`/gestao` → aba Acompanhamento)
- Ao gerar/abrir um mês, **só pré-preencher linhas** para participantes cujo `mes_inicio <= mes selecionado` (os outros ainda não entraram).
- Mostrar badge "Início neste mês" na linha quando `mes_inicio == mes selecionado`.

### 4. Dashboard (`/`)
- Na construção das `rows` de análise (KPIs de perda, top 3, tabela de peso, gráficos de comparação), **excluir** participantes cujo `mes_inicio == mes selecionado` (linha base = mês atual, sem perda calculável).
- Estes participantes continuam aparecendo nas abas neutras (Circunferência, Tratamento, Multidisciplinar) marcados como "Mês de entrada" (sem variação).
- Adicionar nota visual nos KPIs: "X paciente(s) iniciaram neste mês e foram desconsiderados na análise de perda."

### 5. Tipos
- Atualizar `Participante` em `src/lib/dashboard-data.ts` para incluir `mes_inicio: string | null`.

## Arquivos afetados
- migration SQL (nova)
- `src/lib/dashboard-data.ts`
- `src/routes/gestao.tsx`
- `src/routes/index.tsx`
