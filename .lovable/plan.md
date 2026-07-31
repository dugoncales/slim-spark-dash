## Objetivo

Cada usuário passa a ver e editar apenas os participantes dos **grupos atribuídos a ele**, como se cada grupo fosse uma empresa separada. Somente `admin` mantém acesso global.

Regras confirmadas:
- `admin` → vê e edita tudo (inclusive participantes sem grupo).
- `gestor_saude` e `gestor` → escopados aos grupos atribuídos.
- Participantes **sem grupo** → visíveis apenas para `admin`.
- Escopo vale para leitura **e** escrita (insert/update/delete).

## 1. Banco de dados

Nova tabela de atribuição:

```text
user_grupos
  id uuid pk
  user_id uuid -> auth.users (cascade)
  grupo_id uuid -> public.grupos (cascade)
  created_at timestamptz
  unique (user_id, grupo_id)
```

Grants: `SELECT` para `authenticated`, `ALL` para `service_role` (insert/update/delete só via admin nas policies).

Funções `SECURITY DEFINER` (padrão já usado por `has_role`):
- `user_has_grupo(_user_id uuid, _grupo_id uuid) → boolean`
- `user_grupo_ids(_user_id uuid) → uuid[]`
- `can_access_participante(_user_id uuid, _grupo_id uuid) → boolean` — true se admin, senão `_grupo_id` não nulo e pertence aos grupos do usuário.

Policies:
- `user_grupos`: usuário lê as próprias linhas; admin lê/escreve todas.
- `participantes`: substituir as 4 policies atuais por versões que combinam papel + `can_access_participante(auth.uid(), grupo_id)` (no UPDATE, checar tanto `USING` quanto `WITH CHECK`, impedindo mover participante para grupo sem acesso).
- `medicoes`: mesma lógica via subquery no `participante_id` (`EXISTS (select 1 from participantes p where p.id = participante_id and can_access_participante(...))`).
- `grupos`: SELECT restrito a admin ou grupos atribuídos (hoje é `true` para todos os autenticados).

## 2. Administração de atribuições (`/admin`)

Nova aba/secção "Acesso por grupo":
- Lista usuários (reaproveita `list_users_with_roles`) com os grupos atribuídos.
- Multi-seleção de grupos por usuário, salvando em `user_grupos` (insert/delete).
- Registro no `role_audit_log` (ação `grupo_granted` / `grupo_revoked`) via RPCs `grant_user_grupo` / `revoke_user_grupo` com checagem de admin interna.

## 3. Frontend

- Novo hook `useGruposPermitidos()`: retorna `{ grupoIds, isGlobal, loading }` (isGlobal = admin).
- `dashboard-data.ts` → `fetchAll()` já filtra pela RLS, mas os filtros de UI passam a ser limitados: usuários escopados só veem seus grupos nas listas de filtro e a opção "Sem grupo" desaparece.
- `/` (dashboard), `/grupos`, `/gestao`: listas de grupos e filtros derivados de `useGruposPermitidos()`; seleção salva em `localStorage` é saneada contra os grupos permitidos.
- `/gestao` → Cadastro inicial: campo "Grupo" passa a ser **obrigatório** para usuários escopados (só opções permitidas), evitando insert bloqueado pela RLS.
- Estado vazio explícito: "Nenhum grupo atribuído ao seu usuário — peça acesso a um administrador."

## Detalhes técnicos

- Nenhuma alteração em `has_role`; o novo escopo é aditivo às checagens de papel existentes.
- `EXECUTE` das novas funções revogado de `PUBLIC`/`anon`, concedido a `authenticated`.
- `src/integrations/supabase/types.ts` regenera após a migration.
- UI toda em pt-BR, tokens semânticos existentes.

## Fora de escopo

- Convite de usuários por e-mail / auto-atribuição de grupo no signup.
- Hierarquia de grupos (subgrupos).
- Escopo por grupo em `configuracoes` (permanece global).
