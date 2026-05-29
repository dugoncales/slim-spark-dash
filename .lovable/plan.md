## Objetivo

Avaliar a evolução da adesão aos cuidados multidisciplinares por mês, com:
- **Atividade física**: frequência (dias/semana) + intensidade (não pratica / leve / moderada / intensa)
- **Nutrição**: checklist de mudanças específicas na dieta
- **Consultas (psico, nutri, endócrino, ed. física)**: agendadas vs realizadas → % de adesão

Exibido tanto agregado (Dashboard) quanto individual (`/paciente/$id`).

## 1. Banco de dados (migration)

Adicionar colunas em `public.medicoes`:

```sql
-- Atividade física
ALTER TABLE public.medicoes
  ADD COLUMN ativ_fisica_intensidade text
    CHECK (ativ_fisica_intensidade IN ('nao_pratica','leve','moderada','intensa')),
  ADD COLUMN ativ_fisica_dias_semana smallint
    CHECK (ativ_fisica_dias_semana BETWEEN 0 AND 7);

-- Nutrição (checklist booleano)
ALTER TABLE public.medicoes
  ADD COLUMN nutri_reduziu_acucar boolean DEFAULT false,
  ADD COLUMN nutri_reduziu_ultraprocessados boolean DEFAULT false,
  ADD COLUMN nutri_aumentou_proteina boolean DEFAULT false,
  ADD COLUMN nutri_aumentou_vegetais boolean DEFAULT false,
  ADD COLUMN nutri_controle_porcoes boolean DEFAULT false,
  ADD COLUMN nutri_reduziu_alcool boolean DEFAULT false;

-- Consultas agendadas (já existem as realizadas: consultas_*)
ALTER TABLE public.medicoes
  ADD COLUMN consultas_endocrino_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_nutri_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_psico_agendadas smallint DEFAULT 0,
  ADD COLUMN consultas_edfisica_agendadas smallint DEFAULT 0;
```

Todos nullable/default — não quebra dados existentes. RLS já cobre via políticas atuais.

## 2. Camada de dados (`src/lib/dashboard-data.ts`)

Estender o tipo `Medicao` com os novos campos e adicionar helpers puros:

- `calcAderenciaConsultas(m)` → `{ pct, realizadas, agendadas }` por especialidade e total
- `calcEvolucaoAtividadeFisica(participantes, medicoes, coorte?)` → série mensal com distribuição % por intensidade + média de dias/semana
- `calcEvolucaoNutricao(participantes, medicoes, coorte?)` → série mensal com % de pacientes que marcaram cada mudança
- `calcEvolucaoAderenciaConsultas(participantes, medicoes, coorte?)` → série mensal com % de adesão por especialidade

## 3. Captura de dados (`/gestao` + `UploadDialog`)

- Adicionar campos no formulário de medição mensal:
  - Select de intensidade + input numérico de dias/semana
  - 6 checkboxes de mudanças nutricionais (collapsible "Mudanças na dieta")
  - 4 inputs "agendadas" pareados aos existentes "realizadas" (collapsible "Consultas")
- `UploadDialog`: aceitar novas colunas opcionais no Excel; documentar nomes no modelo.

## 4. Visualização — Dashboard (`/`)

Nova seção `CollapsibleSection` "Adesão multidisciplinar" com 3 sub-blocos:

1. **Atividade física** — gráfico de área empilhada 100% por mês (4 faixas de intensidade) + linha sobreposta com média de dias/semana
2. **Nutrição** — gráfico de barras agrupadas por mês: 6 séries (% de pacientes em cada mudança)
3. **Adesão a consultas** — gráfico de linhas: 4 séries (% adesão psico / nutri / endócrino / ed.física) + linha de média global

Respeita o filtro de coorte já existente.

## 5. Visualização — Ficha do paciente (`/paciente/$id`)

Card "Adesão multidisciplinar" com:
- Timeline mensal mostrando intensidade (badge colorido) + dias/semana
- Checklist nutricional por mês (ícones marcados/desmarcados)
- Tabela compacta consultas: realizadas / agendadas / % por especialidade

## 6. Tipos Supabase

`src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.

## Detalhes técnicos

- Sem novas tabelas — tudo em `medicoes`, evita join extra e mantém o modelo "uma linha por mês por participante".
- Cálculos puros em `dashboard-data.ts` (testáveis, sem efeitos).
- Reuso de `MultiMonthBarChart`/`EvolucaoChart` quando possível; novos componentes em `src/components/dashboard/` apenas para gráfico empilhado de intensidade.
- Nenhuma alteração em auth, RLS ou roles — escrita continua restrita a `gestor_saude` e `admin`.
- Sem mudanças em rotas; apenas extensão de páginas existentes.

## Arquivos afetados

- `supabase/migrations/<nova>.sql`
- `src/lib/dashboard-data.ts`
- `src/routes/index.tsx` (Dashboard — nova seção)
- `src/routes/paciente.$id.tsx`
- `src/routes/gestao.tsx` (form de medição)
- `src/components/dashboard/UploadDialog.tsx`
- `src/components/dashboard/AderenciaMultidisciplinar*.tsx` (novos, 2–3 arquivos)
