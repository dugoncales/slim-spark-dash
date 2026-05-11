
## Objetivo

Criar um painel executivo inspirado no layout enviado (HEALTHBIT / RDsaúde) para acompanhar resultados do programa de controle de peso e obesidade, alimentado por upload da planilha Excel ou edição manual, com histórico mês a mês.

## Estrutura visual (fiel ao layout enviado)

Topo: logos HEALTHBIT (esq.) e RDsaúde (dir.), título "Acompanhamento de IMC e Peso", seletor de mês e seletor de centro de custo (placeholder, "Todos" por enquanto).

5 cards de KPI: Peso Inicial Médio, Peso Mês Atual Médio, IMC Inicial Médio, IMC Mês Atual Médio, Perda Média de Peso (%).

Tabela central com colunas: Pessoa, IMC Inicial, Peso Inicial, Peso Mês, IMC Mês, Perda (kg), Perda (%). Toggle "Mostrar nomes" alterna entre "Pessoa 1" e o nome real (Fernanda, David...).

Coluna lateral direita com 3 cards:
- Insights do período (gerados automaticamente: % que perdeu peso, % que reduziu IMC, médias)
- Top 3 evolução do mês (maior % de perda)
- Resumo do grupo (totais e médias)

Dois gráficos de barras agrupadas (recharts): Peso Inicial vs Mês / IMC Inicial vs Mês.

Abas extras (abaixo do dashboard principal) para os campos adicionais que você pediu:
- **Circunferência Abdominal**: tabela + gráfico inicial vs mês
- **Tratamento**: tabela com Medicamento e Dose por pessoa
- **Acompanhamento Multidisciplinar**: tabela com nº de consultas (Endócrino, Nutri, Psicologia, Educadora Física)

## Atualização de dados (upload + manual)

Botão "Importar planilha" abre modal que aceita o .xlsx no mesmo formato enviado. Parse com `xlsx` (SheetJS) no navegador, validação de colunas, preview e confirmação. Salva como um snapshot do mês selecionado.

Botão "Adicionar/Editar mês" abre formulário para criar um novo mês ou editar pessoas individualmente (peso, IMC, circunferência, medicamento, dose, consultas, observação). Permite acrescentar Mês 2, Mês 3 etc., reaproveitando os dados iniciais.

Seletor de mês no topo alterna entre todos os snapshots já cadastrados (Março/2025, Abril/2025...). KPIs e tabela recalculam comparando "Inicial" com "mês selecionado".

## Backend (Lovable Cloud)

Necessário para guardar histórico mês a mês com login.

Tabelas:
- `participantes` (id, numero, nome, peso_inicial, imc_inicial, circunferencia_inicial, ativo)
- `medicoes` (id, participante_id, mes_referencia DATE, peso, imc, circunferencia, medicamento, dose, consultas_endocrino, consultas_nutri, consultas_psico, consultas_edfisica, observacao)
- RLS: somente usuários autenticados podem ler/escrever (programa interno).

Auth: tela de login simples (email/senha) via Lovable Cloud, já que dados são sensíveis (saúde).

## Privacidade

Toggle global "Mostrar nomes" (default: ocultos, exibe "Pessoa N"). Estado persistido em localStorage. Nas exportações/prints o estado atual é respeitado.

## Identidade visual

Paleta verde da RDsaúde (verde-escuro #1F5F3F e verde-claro/lime para acentos), branco, cinza neutro. Tipografia sans-serif limpa (Inter). Cards com cantos arredondados e ícones em quadrado verde, idênticos ao layout. Tema definido em `src/styles.css` com tokens semânticos (`--primary`, `--accent`, `--success`).

## Detalhes técnicos

- Stack: TanStack Start + React + Tailwind + shadcn + recharts + Lovable Cloud (Supabase).
- Parsing Excel: biblioteca `xlsx` (SheetJS), client-side.
- Server functions (`createServerFn` + `requireSupabaseAuth`) para CRUD de participantes/medições.
- Rotas: `/login`, `/` (dashboard), `/admin` (gestão de participantes e meses).
- KPIs e insights calculados em memória a partir do mês selecionado.

## Entregáveis

1. Tela de login.
2. Dashboard principal idêntico ao layout, com seletor de mês funcional.
3. Modal de upload de planilha (.xlsx) com validação.
4. Tela admin para edição manual de participantes e medições.
5. Abas adicionais: circunferência, tratamento, acompanhamento multidisciplinar.
6. Toggle de privacidade de nomes.
7. Seed inicial com os 11 participantes de Março/2025 da planilha enviada.
