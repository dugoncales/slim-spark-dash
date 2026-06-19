## Objetivo

Permitir agrupar participantes (ex.: por empresa) e filtrar o dashboard por um ou mais grupos, mantendo os mesmos indicadores já existentes — recalculados sobre o subconjunto selecionado.

## Modelo de dados

Cada participante pertence a **um único grupo** (ou nenhum). Apenas admin gerencia grupos.

Nova tabela `grupos`:
- `nome` (único, ex.: "Empresa A")
- `cor` (opcional, hex, para badges nos gráficos futuros)
- `ativo` (boolean)

Alteração em `participantes`:
- nova coluna `grupo_id uuid` (nullable, FK → `grupos.id`, ON DELETE SET NULL)

RLS:
- `grupos`: SELECT liberado para qualquer usuário autenticado (necessário para o filtro do dashboard); INSERT/UPDATE/DELETE apenas para `admin` via `has_role`.
- `participantes`: manter políticas atuais; o campo `grupo_id` é editado pelas mesmas regras atuais de edição de participante.

GRANTs padrão (`authenticated` + `service_role`) na nova tabela.

## Gestão de grupos (admin)

Nova aba **"Grupos"** em `/admin` (já restrita a admin):
- Listar grupos com contagem de participantes
- Criar / renomear / ativar-desativar / excluir grupo
- Excluir grupo desvincula participantes (não apaga ninguém)

## Atribuição de grupo aos participantes

Na aba **Cadastro inicial** de `/gestao` (gestor_saude e admin):
- Novo campo `Grupo` (dropdown com grupos ativos + opção "— Sem grupo —") no formulário de cada participante
- Atualização inline salva via update existente em `participantes`

Sem alterações no upload Excel nesta entrega (atribuição manual, conforme escolha).

## Filtro no dashboard

No topo de `/` (logo após o seletor de coorte de mês de início), novo **multi-seletor "Grupos"**:
- Popover com checkboxes listando os grupos ativos + opção "Sem grupo"
- Padrão: nenhum selecionado = "Todos" (comportamento atual)
- Badge resumido (ex.: "2 grupos") + botão "Limpar"

Persistência: estado local na URL via search params (`?grupos=id1,id2`), para que filtros sejam compartilháveis e sobrevivam ao recarregar.

## Recalcular indicadores

Adicionar parâmetro opcional `grupoIds?: string[] | null` em todas as funções agregadoras de `src/lib/dashboard-data.ts`:
- `calcEvolucaoGrupo`, `calcMarcos`, `calcEvolucaoAtividadeFisica`, `calcEvolucaoNutricao`, `calcEvolucaoAderenciaConsultas`

Quando `grupoIds` é fornecido e não vazio, filtra `baseParts` adicionalmente por `p.grupo_id ∈ grupoIds` (com `null` representando "sem grupo" quando incluído na seleção). Combina com o filtro de coorte já existente (AND).

`Dashboard` em `src/routes/index.tsx` passa a seleção atual para todas as chamadas e ajusta o título dos KPIs (ex.: "Visão geral — Empresa A, Empresa B") para deixar claro o recorte.

## Migração

1 migration SQL contendo: tabela `grupos` + GRANTs + RLS + políticas, coluna `participantes.grupo_id` + FK, trigger `set_updated_at` em `grupos`.

## Detalhes técnicos

- Tipos TS gerados automaticamente após a migration; depois disso, atualizar `Participante` type em `dashboard-data.ts` para incluir `grupo_id: string | null` e adicionar `Grupo` type.
- O filtro é puramente client-side (já carregamos todos os dados); zero impacto em performance para o volume atual.
- Cores dos grupos ficam preparadas para uma futura visualização de comparação lado a lado, mas essa visualização **não** entra nesta entrega (você escolheu multi-seleção, não comparação).

## Fora do escopo

- Coluna "grupo" no upload Excel
- Gráficos comparativos lado a lado por grupo
- Permissão de gestor_saude para criar grupos (apenas admin, conforme escolhido)
