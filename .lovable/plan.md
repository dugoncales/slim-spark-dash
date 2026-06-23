Adicionar um filtro por grupo (ou "sem grupo") na tela de Gestão, aplicável às duas sub-abas (Cadastro inicial e Acompanhamento mensal), para facilitar o lançamento de dados por grupo.

## Alterações

### 1. `src/routes/gestao.tsx` — Filtro por grupo em ambas as abas

- **State global de filtro**: adicionar `filtroGrupo` (string) no componente `Gestao`, com opções:
  - `"__todos"` — Todos os participantes
  - `"__sem"` — Sem grupo
  - `<id_do_grupo>` — cada grupo existente
- **Passar `filtroGrupo` e `setFiltroGrupo`** para as sub-componentes `CadastroInicial` e `Acompanhamento` como props.
- **Aba "Cadastro inicial"**:
  - Aplicar o filtro junto ao filtro de mês de início já existente (`filtroMes`).
  - A tabela editável exibe apenas participantes que satisfazem ambos os filtros (mês + grupo).
- **Aba "Acompanhamento mensal"**:
  - Incluir o filtro na barra de seleção do mês (ao lado de "Mês para editar").
  - A tabela de acompanhamento exibe apenas participantes do grupo selecionado (mantendo a regra atual de filtrar por `!p.mes_inicio || p.mes_inicio <= mesSel`).

### UI / UX
- O filtro será um `Select` do shadcn, posicionado:
  - Na aba **Cadastro**: ao lado do filtro de mês de início, no cabeçalho da tabela.
  - Na aba **Acompanhamento**: ao lado do seletor de mês, no topo do card de seleção.
- Labels: "Filtrar por grupo:" e opções claras como "Todos", "Sem grupo", e o nome de cada grupo cadastrado.

## Fora do escopo
- Nenhuma alteração em banco de dados ou migrations.
- Sem mudança no modelo de upload de Excel nem no dashboard geral/individual.
- Sem alteração nos KPIs ou cálculos de risco cardiovascular.