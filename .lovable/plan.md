## Objetivo

Separar a tela de Gestão em duas abas: **Cadastro inicial** (dados-base dos participantes, totalmente editáveis) e **Acompanhamento mensal** (já existente, está ótimo).

## Aba 1 — Cadastro inicial

Tabela com todos os participantes, cada linha permitindo editar inline:
- Nome
- Altura (m)
- Peso inicial (kg)
- IMC inicial (calculado automaticamente a partir de peso/altura, somente leitura)
- Circunferência inicial (cm)
- Ativo (sim/não)
- Botão remover

Acima da tabela, formulário "Adicionar participante" (já existe hoje, será movido para esta aba).

Também nesta aba: card "Mês de início do acompanhamento" (já existe, faz mais sentido aqui pois é parte da configuração inicial).

Botão "Salvar alterações iniciais" agrupa todas as edições pendentes em um único save (mesmo padrão da aba de acompanhamento). Ao salvar peso/altura, o `imc_inicial` é recalculado automaticamente.

## Aba 2 — Acompanhamento mensal

Mantém exatamente o que existe hoje: seletor de mês, criar novo mês (pré-preenchido), grade editável de medições mensais, salvar. A coluna "Altura" sai daqui (vai pro cadastro inicial), pois é dado fixo do participante.

## Layout

Usar o componente `Tabs` do shadcn no topo da página `/gestao`:
- Aba "Cadastro inicial"
- Aba "Acompanhamento mensal" (default)

## Detalhes técnicos

- Arquivo único: `src/routes/gestao.tsx` reorganizado em dois sub-componentes (`CadastroInicial`, `Acompanhamento`) compartilhando o `useQuery(["gestao"])` e `refetch`.
- Edição inicial usa o mesmo padrão de estado pendente (`Record<string, Partial<Participante>>`) + botão Salvar.
- Sem mudanças de schema — colunas `nome`, `altura`, `peso_inicial`, `imc_inicial`, `circunferencia_inicial`, `ativo` já existem em `participantes`.
- Sem mudanças nas RLS.
