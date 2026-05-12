## Migração para Supabase externo

Vamos migrar este projeto do Lovable Cloud para uma conta Supabase própria sua. O processo tem partes que **só você pode fazer** (criar projeto, conectar) e partes que **eu preparo** (arquivos SQL prontos).

### O que existe hoje para migrar
- 11 participantes, 33 medições, 1 configuração, 2 atribuições de papel (`user_roles`)
- Usuários do `auth.users` (sua conta de login) — esses **não migram automaticamente**, será preciso recriar o login no novo Supabase
- Estrutura: enum `app_role`; tabelas `participantes`, `medicoes`, `configuracoes`, `user_roles`, `role_audit_log`; funções `has_role`, `set_updated_at`, `list_users_with_roles`, `handle_new_user_role`; políticas RLS

---

### Etapa 1 — Eu gero os arquivos de migração

Vou criar dois arquivos em `/mnt/documents/` (você baixa):

1. **`schema.sql`** — recria toda a estrutura no Supabase novo:
   - enum `app_role`
   - tabelas com colunas, defaults e constraints
   - funções (`has_role`, `set_updated_at`, `list_users_with_roles`, `handle_new_user_role`)
   - políticas RLS idênticas às atuais
   - trigger no `auth.users` para atribuir papel `gestor` automaticamente em novos signups

2. **`data.sql`** — `INSERT`s com os dados atuais de `participantes`, `medicoes` e `configuracoes` (preservando IDs/UUIDs).
   - **`user_roles` NÃO entra aqui** porque depende dos UUIDs de usuários, que serão diferentes no novo Supabase. Você cria seu novo usuário e atribui o papel `admin` manualmente após o primeiro login.

### Etapa 2 — Você (no supabase.com)
1. Criar projeto novo
2. Em SQL Editor: rodar `schema.sql`, depois `data.sql`
3. Em Authentication → Providers: ativar Email/Password (e Google, opcional)
4. Em Authentication → URL Configuration: adicionar a URL do app Lovable como Site URL e Redirect URL

### Etapa 3 — Você (no Lovable)
1. Sidebar → **Connectors** → **Supabase** → Connect
2. Selecionar seu projeto novo
3. O Lovable atualiza automaticamente `client.ts`, `types.ts` e `.env`

### Etapa 4 — Eu valido o código
- Confirmo que `src/integrations/supabase/client.ts`, `types.ts`, `auth-middleware.ts` e `client.server.ts` continuam funcionando com a nova conexão
- Reinicio o dev server se necessário
- Teste rápido: login + leitura do dashboard

### Etapa 5 — Você (primeiro acesso)
1. Acessar `/login` e criar sua conta no novo Supabase
2. No SQL Editor do Supabase, rodar:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<seu-novo-user-id>', 'admin');
   ```
   (você pega o user_id em Authentication → Users)

---

### Pontos de atenção
- **Lovable Cloud não desliga** — ele continua existindo no projeto, mas o app passa a usar o seu Supabase a partir do momento da conexão. Os dados antigos no Lovable Cloud ficam parados como backup.
- **Logins atuais não funcionam mais** — qualquer pessoa que usava o sistema precisará criar conta novamente.
- **Edge functions / secrets**: este projeto não usa edge functions, então não há nada para portar nesse aspecto.

### Entregáveis desta plano (quando aprovar)
Eu produzo `schema.sql` e `data.sql` em `/mnt/documents/` e te entrego os links para download. A partir daí, você executa as etapas 2 e 3, e eu retomo na etapa 4.