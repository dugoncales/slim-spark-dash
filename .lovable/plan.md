# Exames laboratoriais como indicadores secundários

## Escopo

Adicionar campos opcionais de **glicemia jejum, HbA1c, colesterol total, HDL, LDL, triglicerídeos, PA sistólica e PA diastólica** ao acompanhamento mensal. Exibir na página do paciente e no dashboard geral como seção separada de "Indicadores secundários", com KPIs de melhora combinando saída de faixa alterada + magnitude clínica de redução.

## 1. Banco (migration)

Adicionar 8 colunas nullable em `public.medicoes`:

- `glicemia_jejum` numeric (mg/dL)
- `hba1c` numeric (%)
- `colesterol_total` numeric (mg/dL)
- `hdl` numeric (mg/dL)
- `ldl` numeric (mg/dL)
- `triglicerideos` numeric (mg/dL)
- `pa_sistolica` integer (mmHg)
- `pa_diastolica` integer (mmHg)

Todas opcionais — nenhum default, sem CHECK constraint. RLS/policies existentes já cobrem colunas novas.

## 2. Regras clínicas (novo `src/lib/exames.ts`)

Faixas de referência + critério **combinado** por indicador:

```text
Indicador          Alterado             Melhora relevante
────────────────────────────────────────────────────────────
Glicemia jejum     ≥100 mg/dL           -10 mg/dL OU saiu da faixa
HbA1c              ≥5,7%                -0,5 pp OU saiu da faixa
Colesterol total   ≥200 mg/dL           -10% OU saiu da faixa
LDL                ≥130 mg/dL           -10% OU saiu da faixa
HDL                <40 (H) / <50 (M)    +5 mg/dL OU entrou na faixa
Triglicerídeos     ≥150 mg/dL           -15% OU saiu da faixa
PA sistólica       ≥130 mmHg            -5 mmHg OU saiu da faixa
PA diastólica      ≥85 mmHg             -5 mmHg OU saiu da faixa
```

HDL usa sexo do participante (campo já existe). Um paciente "melhorou" no indicador quando último valor vs. primeiro valor registrado satisfaz uma das duas condições.

Funções exportadas:
- `classificaExame(tipo, valor, sexo?) → 'normal' | 'alterado' | null`
- `avaliaMelhora(tipo, inicial, atual, sexo?) → 'melhorou' | 'piorou' | 'estavel' | null`
- `EXAMES_META` (labels, unidades, cores, ordem de exibição)

## 3. Entrada de dados — aba Gestão

`src/routes/gestao.tsx`, sub-aba **Acompanhamento mensal**:

- Adicionar seção colapsável "Exames laboratoriais (opcional)" no formulário de edição da linha, com 8 inputs numéricos agrupados em 3 blocos: Glicêmico / Lipídico / Pressão arterial.
- Não expandir a tabela principal com 8 colunas novas — usar um botão "Exames" por linha que abre um popover/dialog, mantendo a densidade atual.
- Aba **Cadastro inicial**: não incluir (exames começam no acompanhamento, alinhado à decisão "opcional por mês").

## 4. Upload Excel

`src/components/dashboard/UploadDialog.tsx`: aceitar as 8 colunas opcionais no template do acompanhamento mensal (headers: `glicemia_jejum`, `hba1c`, `colesterol_total`, `hdl`, `ldl`, `triglicerideos`, `pa_sistolica`, `pa_diastolica`). Se ausentes, ignora. Documentação inline no dialog atualizada.

## 5. Página individual do paciente

`src/routes/paciente.$id.tsx`, nova seção `<ExamesCard />` **abaixo** do `RiscoCard` e recolhida por padrão (`CollapsibleSection`) — mantém o layout atual limpo:

- Grid 3 colunas × cards por indicador com: valor atual, valor inicial, delta, badge de status (normal/alterado) e badge de melhora (verde/vermelho/cinza).
- Mini-sparkline de evolução ao lado de cada indicador quando houver ≥2 pontos.
- Colunas novas no "Histórico mensal" ficam ocultas por padrão; um toggle "Mostrar exames" adiciona as 8 colunas à tabela.

## 6. Dashboard geral

`src/routes/index.tsx`, nova seção colapsável **"Indicadores secundários (exames laboratoriais)"** abaixo da seção de risco cardiovascular:

- **KPIs** (só considera pacientes com ao menos 2 medições registradas do indicador):
  - % que melhorou glicemia (jejum ou HbA1c)
  - % que melhorou perfil lipídico (qualquer um: CT, LDL, HDL, TG)
  - % que melhorou pressão arterial (sistólica ou diastólica)
  - Cobertura: nº pacientes com exames registrados / total
- **Ranking** de pacientes com maior melhora agregada (top 5).
- **Notas metodológicas** explicando critério combinado.

Seção só aparece quando há ≥1 medição com algum exame registrado no dataset.

## 7. Export

`ExportSectionsDialog.tsx`: adicionar checkbox "Exames laboratoriais" que inclui as 8 colunas na exportação Excel do histórico.

## Detalhes técnicos

- `src/lib/dashboard-data.ts`: estender tipos `Medicao`; adicionar `calcExamesParticipante(p, medicoes)` retornando `{ [indicador]: { inicial, atual, delta, status, melhora } }` e `calcExamesGrupo(participantes, medicoes)` para as taxas do dashboard.
- Types Supabase (`src/integrations/supabase/types.ts`) regeneram após a migration.
- Sem mudanças em risco cardiovascular, IMC, ou lógica de peso.
- pt-BR em toda UI. Tokens de cor via classes semânticas existentes (`text-success`, `text-destructive`, `bg-warning/15`).

## Fora de escopo

- Alertas/notificações automáticas.
- Metas personalizadas por paciente.
- Integração com laboratórios externos.
- Gráficos comparativos entre grupos por exame (pode vir depois).