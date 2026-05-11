## Objetivo

No Acompanhamento mensal, quando o mês selecionado é o **mês de início** do participante, exibir automaticamente a **circunferência abdominal inicial** (cadastrada no Cadastro inicial) na coluna `Circ.`, em vez de aparecer em branco.

## Diagnóstico

A lógica de `criarMes` já preenche `circunferencia` a partir de `circunferencia_inicial` quando não há mês anterior. Porém, nos dados atuais (ex.: março/2025), as `medicoes` foram criadas antes dessa regra existir, então o campo está `null` no banco e aparece vazio na grade.

## Mudanças

### 1. Backfill de dados existentes (migration SQL)
Atualizar `medicoes` onde:
- `mes_referencia = participante.mes_inicio` (linha do mês de entrada)
- `circunferencia IS NULL`
- `participante.circunferencia_inicial IS NOT NULL`

→ setar `circunferencia = participante.circunferencia_inicial`. Mesma lógica para `peso` e `imc` (caso também estejam nulos no mês de entrada), garantindo consistência da linha base.

### 2. Acompanhamento mensal (`src/routes/gestao.tsx`) — fallback de exibição
Na renderização da grade, para participantes cujo `mes_inicio === mesSel`:
- Se o valor exibido de `circunferencia` (após edits locais) estiver vazio, usar `participante.circunferencia_inicial` como valor padrão sugerido no input.
- Idem para `peso` e `imc` por coerência (já é o caso na maioria das linhas, mas garante para novos cadastros futuros).

Isso protege casos em que o participante for cadastrado depois e a `medicao` daquele mês não passar pelo `criarMes`.

## Arquivos afetados
- nova migration SQL (backfill)
- `src/routes/gestao.tsx` (fallback visual no input)

Sem mudanças no Dashboard (`/`) — ele já lê de `medicoes`, e após o backfill os valores ficam corretos.
