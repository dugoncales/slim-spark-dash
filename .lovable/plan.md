## Objetivo

Adicionar análise de **risco de angina** e **risco cardiovascular adicional** com base na circunferência abdominal acima do limite WHO, exibindo risco atual, inicial e variação (melhora/piora) no dashboard geral e na página individual do paciente.

## Regras de cálculo

**Limites WHO (por sexo):**
- Homens: 94 cm
- Mulheres: 80 cm

**Excesso (cm):** `max(0, circunferencia - limite_sexo)`

**Risco relativo de angina:** `(1,075)^excesso − 1` exibido em %
Ex.: 5 cm acima ⇒ +43,6%

**Risco cardiovascular adicional:** `3,5% × excesso` (média de 3–4% por cm)
Ex.: 5 cm acima ⇒ +17,5%

**Variação de risco:** `risco_atual − risco_inicial` (negativo = melhora).

Quando `sexo` não estiver preenchido, o paciente entra como "sem classificação" e fica fora das médias (mostrado contador).

## Mudanças

### 1. Banco de dados (migração)
- Adicionar coluna `sexo` em `participantes` (enum `sexo_tipo` ∈ {`masculino`, `feminino`}, nullable).
- Sem mudanças em `medicoes` (já tem `circunferencia`).

### 2. Camada de dados — `src/lib/dashboard-data.ts`
Novos helpers puros:
- `LIMITE_CINTURA = { masculino: 94, feminino: 80 }`
- `calcExcessoCintura(circ, sexo)` → cm acima do limite (0 se ≤ limite ou sexo nulo)
- `calcRiscoAngina(excesso)` → `(1.075 ** excesso) - 1`
- `calcRiscoCV(excesso)` → `0.035 * excesso`
- `calcRiscoParticipante(p, medicaoAtual)` → `{ inicial, atual, deltaAngina, deltaCV }` usando `circunferencia_inicial` vs última medição
- `calcRiscoMedioGrupo(participantes, medicoes, filtros)` → médias de risco atual/inicial/delta, % de participantes que reduziram risco

### 3. Cadastro e upload
- **`UploadDialog.tsx`**: aceitar coluna opcional `sexo` (`M`/`F`/`Masculino`/`Feminino`), normalizar e gravar em `participantes.sexo`. Atualizar planilha-modelo e instruções.
- **`gestao.tsx`**: adicionar `<Select>` de sexo no formulário de criação/edição de participante.

### 4. Dashboard geral — `src/routes/index.tsx`
Nova seção colapsável **"Risco cardiovascular (circunferência)"** com:
- KPI: Risco de angina médio (atual) + delta vs inicial (verde se ↓, vermelho se ↑)
- KPI: Risco CV adicional médio (atual) + delta
- KPI: % de participantes com redução de risco
- KPI: Excesso médio de cintura (cm acima do limite)
- Mini-tabela: top 5 maiores reduções e top 5 maiores aumentos
- Respeita filtros de mês/grupo/cohort já existentes
- Rodapé com nota metodológica (limites WHO, fórmulas)

### 5. Página individual — `src/routes/paciente.$id.tsx`
Novo card **"Risco cardiovascular estimado"** acima dos gráficos:
- Risco de angina inicial → atual, com seta e variação em pp
- Risco CV adicional inicial → atual, com seta e variação em pp
- Badge: "Redução de X cm na cintura" ou "Aumento de X cm"
- Se sexo não preenchido: aviso "Preencha o sexo em /gestao para calcular o risco"
- Mini-linha do tempo do risco ao longo dos meses (reutiliza `Line` do recharts já em uso)

## Detalhes técnicos

- O ESLint bloqueia mudanças no `client.ts`/`types.ts` gerados; após a migração, o tipo `sexo` aparece automaticamente em `types.ts` regenerado.
- Cores: usar `--destructive` para risco alto/aumento, `--primary` (verde semântico já existente nos KPIs) para redução. Sem hardcode de hex.
- Formatação: `Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })` para taxas; `pp` (pontos percentuais) para variações.
- Sem novas dependências.

## Fora do escopo

- Cálculo de risco absoluto de evento (precisa de score validado tipo Framingham).
- Alertas/notificações por paciente em zona de risco.
- Edição em lote do campo sexo (será preenchido via upload Excel ou edição individual).
