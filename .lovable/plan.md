## Mudanças solicitadas

### 1. Renomear "Administração" → "Gestão" e mover para sidebar
- Adicionar `SidebarProvider` + `AppSidebar` no `__root.tsx` envolvendo as rotas autenticadas.
- Sidebar com itens: **Dashboard** (`/`), **Gestão** (`/gestao`), e botão de **Sair**.
- Botão de colapsar (`SidebarTrigger`) sempre visível no header.
- Renomear arquivo `src/routes/admin.tsx` → `src/routes/gestao.tsx` e atualizar título para "Gestão".
- Remover o botão "Admin" antigo do header do dashboard (substituído pela sidebar).

### 2. Campo Altura no cadastro de participante (cálculo automático do IMC)
- Adicionar coluna `altura` (numérica, em metros) na tabela `participantes` via migração.
- Atualizar formulário "Adicionar participante" em Gestão:
  - Novos campos: **Nome**, **Altura (m)**, **Peso inicial (kg)**, **Circunferência (cm)**.
  - **IMC inicial calculado automaticamente** = `peso / (altura²)` (exibido como readonly).
- Na grade de edição mensal: ao digitar **Peso**, o campo **IMC** é recalculado automaticamente usando a altura do participante (continua editável caso queira sobrescrever).
- Se um participante antigo não tiver altura cadastrada, mostra um aviso e permite preencher inline.

### 3. Pré-preenchimento ao criar/abrir mês
- Ao clicar em "Criar / abrir mês":
  - Se já existem medições no mês anterior mais recente, copia para o novo mês os valores de: **peso, imc, circunferência, medicamento, dose, consultas (todas), observação**.
  - Se não houver mês anterior, usa os valores **iniciais** do participante (peso_inicial, imc_inicial, circunferencia_inicial) como ponto de partida.
- O usuário ajusta apenas o que mudou e salva.

### 4. Cálculo de IMC ao importar planilha (opcional, fallback)
- Se a planilha trouxer peso mas não IMC, e o participante tiver altura, calcular IMC automaticamente no `UploadDialog`.

## Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE public.participantes ADD COLUMN altura numeric;
```
(Nullable para não quebrar registros existentes; UI cobra preenchimento ao editar.)

**Arquivos afetados:**
- `supabase/migrations/...` (nova migração para `altura`)
- `src/components/app-sidebar.tsx` (novo)
- `src/routes/__root.tsx` (envolver com SidebarProvider, exceto na rota `/login`)
- `src/routes/admin.tsx` → renomear para `src/routes/gestao.tsx` + lógica de pré-preenchimento e cálculo de IMC
- `src/routes/index.tsx` (remover link "Admin" do header, ajustar layout)
- `src/components/dashboard/UploadDialog.tsx` (cálculo de IMC quando faltar)
- `src/lib/dashboard-data.ts` (adicionar `altura` no tipo `Participante`)
