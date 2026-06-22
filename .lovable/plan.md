## Objetivo

Substituir as fórmulas atuais de risco (angina 7,5%/cm e CV adicional 3,5%/cm) por uma **única estimativa de risco cardiovascular** baseada na nova tabela executiva, mantendo limites WHO (H 94 cm / M 80 cm) e a comparação inicial × atual já existente.

## Nova tabela de referência

| Excesso (cm) | Risco mínimo | Risco máximo |
|---|---|---|
| +5  | 5%  | 10% |
| +10 | 10% | 20% |
| +15 | 15% | 30% |
| +20 | 20% | 40% |
| +30 | 35% | 60% |
| +40 | 50% | 100% |

Regras:
- `excesso = max(0, circunferencia − limite_sexo)`
- `riscoMin(excesso)` e `riscoMax(excesso)` por **interpolação linear** entre os pontos da tabela. Abaixo de 5 cm: interpola de (0, 0%) a (5, 5%/10%). Acima de 40 cm: extrapola usando a última inclinação (5%/cm min, 4%/cm max), com teto exibido como "≥ valor".
- Resultado por participante: faixa `min–max` para inicial e atual; **delta** calculado sobre o ponto médio `(min+max)/2`.

## Mudanças

### 1. `src/lib/dashboard-data.ts`
- Remover `calcRiscoAngina` e `calcRiscoCV`.
- Adicionar `RISCO_TABELA` (array de pontos) + `calcRiscoCVFaixa(excesso) → { min, max, medio }`.
- Atualizar `RiscoParticipante` para:
  ```
  { circInicial, circAtual, excessoInicial, excessoAtual, deltaCintura,
    riscoMinInicial, riscoMaxInicial, riscoMedioInicial,
    riscoMinAtual,   riscoMaxAtual,   riscoMedioAtual,
    deltaMedio }   // negativo = melhora
  ```
- `calcRiscoMedioGrupo` passa a agregar `riscoMedioAtual`, `deltaMedio`, `% participantes com redução` e `excessoMedio` (remove KPIs separados de angina/CV).

### 2. `src/components/dashboard/RiscoCard.tsx` (paciente individual)
- Um único bloco "Risco cardiovascular estimado" mostrando faixa atual `12% – 24%` (em destaque) com a faixa inicial menor ao lado (`de 18% – 36%`).
- Badge com variação do ponto médio em pp (verde se redução, vermelho se aumento).
- Badge existente de "− X cm na cintura" e limite WHO mantidos.
- Nota de rodapé atualizada citando a tabela de referência (sem fórmulas exponenciais).

### 3. `src/routes/index.tsx` (dashboard geral)
- Seção "Risco cardiovascular (circunferência)" passa a ter 3 KPIs (em vez de 4):
  - Risco CV médio atual (ponto médio) + delta vs inicial
  - % de participantes com redução de risco
  - Excesso médio de cintura (cm)
- Rankings de maiores reduções / aumentos passam a usar `deltaMedio`.
- Texto metodológico do rodapé atualizado.

### 4. `src/components/dashboard/ExportSectionsDialog.tsx`
- Rótulo da seção mantém-se; remover menções a "angina" / "CV adicional" no texto auxiliar, se houver.

## Fora do escopo

- Migração de banco (a coluna `sexo` já existe).
- Mudança nos limites WHO ou no campo sexo.
- Score absoluto de evento (Framingham etc.).
- Edição da planilha-modelo de upload.
