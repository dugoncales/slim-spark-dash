# Plano de melhorias — análise por grupos

Entrega das 4 melhorias selecionadas, em ordem de implementação para reaproveitar código entre elas.

## 1. Coluna "grupo" no upload Excel

Arquivo: `src/components/dashboard/UploadDialog.tsx`.

- Aceitar nova coluna opcional **`grupo`** na planilha (nome do grupo, texto).
- No parser:
  - Carregar `grupos` ativos uma vez antes do processamento.
  - Para cada linha com `grupo` preenchido: buscar por nome (case-insensitive). Se não existir, **criar automaticamente** com cor padrão (próxima da paleta) — apenas se o usuário for admin; gestor_saude recebe aviso e a linha é importada sem grupo.
  - Atribuir `grupo_id` no upsert de `participantes`.
- Atualizar o modelo de planilha/instruções no diálogo listando a nova coluna como opcional.
- Relatório final do upload mostra quantos grupos foram criados e quantos participantes foram vinculados.

## 2. Dashboard executivo por grupo

Novo arquivo: `src/routes/grupos.tsx` (rota `/grupos`), item no `AppSidebar` para qualquer usuário autenticado.

Layout: grid de cards, um por grupo ativo + card "Sem grupo".

Cada card mostra:
- Nome do grupo + bolinha colorida + nº de participantes ativos.
- KPIs compactos: % atingiu meta de IMC, Δ peso médio, Δ circunferência média, aderência média de consultas (todos no período já filtrado pela coorte selecionada no topo).
- Mini sparkline de evolução de peso médio.
- Botão "Ver no dashboard" → navega para `/` com `?grupos=<id>` pré-selecionado.

Reaproveita os cálculos de `dashboard-data.ts` passando `grupoIds: [id]` para cada card. Filtro de coorte (mês de início) também disponível no topo.

## 3. Comparação lado a lado de grupos

No dashboard principal (`src/routes/index.tsx`), quando o filtro de grupos tiver **2+ grupos selecionados**, ativar modo comparação:

- Novo toggle "Comparar grupos" ao lado do filtro (default ligado quando 2+ grupos selecionados).
- Gráficos de evolução (`EvolucaoChart`): renderizar **uma série por grupo** no mesmo gráfico, cada série na cor do grupo. Aplica-se a: peso médio, IMC médio, circunferência, aderência de consultas, atividade física, nutrição.
- KPIs no topo: mostrar **mini-tabela** com uma linha por grupo (em vez de cards únicos), colunas = mesmas métricas atuais.
- Quando 0 ou 1 grupo selecionado, mantém visualização atual.

Mudanças técnicas:
- Adicionar `calcEvolucaoPorGrupo(participantes, medicoes, grupoIds, calcFn)` em `dashboard-data.ts` que retorna `Record<grupoId, EvolucaoPoint[]>`.
- `EvolucaoChart` aceita prop opcional `series: { id, nome, cor, dados }[]` para multi-série.

## 4. Exportar relatório filtrado por grupo

Arquivos: `src/components/dashboard/ExportMenu.tsx` e `ExportSectionsDialog.tsx`.

- Exportação já existente passa a respeitar o filtro de grupos ativo no dashboard.
- Cabeçalho do PDF/Excel exportado inclui:
  - Linha "Grupos: Nome A, Nome B" (ou "Todos" / "Sem grupo").
  - Linha "Coorte: <mês de início>" (já existente, manter).
- Nome do arquivo: `relatorio_<grupos-slug>_<data>.pdf` (ex.: `relatorio_empresa-a_2026-06-19.pdf`). Se "Todos", usa `relatorio_geral`.
- Se modo comparação estiver ativo, o PDF gera **uma seção por grupo** (reusa renderização atual aplicada N vezes) + uma seção "Comparativo" com gráficos multi-série.

## Detalhes técnicos

- Sem mudanças de schema: `participantes.grupo_id` e tabela `grupos` já existem da entrega anterior.
- Sem novas dependências.
- Reaproveitamento: passos 2, 3 e 4 dependem do parâmetro `grupoIds` já adicionado às funções de `dashboard-data.ts`.
- Performance: `fetchAll()` já traz `grupos`; cálculos por grupo no card executivo rodam em memória sobre o mesmo dataset.

## Fora de escopo

- Edição de grupo direto a partir do card executivo (continua em `/admin`).
- Comparação entre coortes diferentes simultaneamente.
- Agendamento/envio automático de relatórios por email.
