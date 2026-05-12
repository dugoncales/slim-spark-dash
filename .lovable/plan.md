## Próximos passos no Supabase da TI (antes de migrar o código)

Você já rodou o `migration_supabase_v2.sql` com sucesso. Agora faltam **3 passos no painel do Supabase** e depois **1 passo no Lovable** para trazer o código.

---

### Passo 1 — Configurar Authentication no Supabase

No painel que você está vendo (`Authentication`):

**1.1 Sign In / Providers**
- Clique em **Sign In / Providers** (menu esquerdo)
- **Email**: já vem habilitado. Decida:
  - `Confirm email` = **ON** (recomendado, usuário precisa confirmar email) — mas exige SMTP configurado
  - `Confirm email` = **OFF** (mais simples para testar agora; pode ligar depois)
- **Google** (opcional, se quiser login com Google):
  - Habilite o provider Google
  - Será necessário criar credenciais OAuth no Google Cloud Console e colar Client ID + Secret
  - Se quiser pular agora, deixe só Email e ligue Google depois

**1.2 URL Configuration**
- Clique em **URL Configuration**
- **Site URL**: coloque a URL do *novo* projeto Lovable (ex: `https://seu-novo-projeto.lovable.app`)
- **Redirect URLs**: adicione:
  - `https://seu-novo-projeto.lovable.app/**`
  - `http://localhost:5173/**` (para desenvolvimento)

> Se ainda não criou o novo projeto Lovable, faça isso primeiro (próximo passo) e volte aqui depois.

---

### Passo 2 — Criar o novo projeto Lovable e conectar ao Supabase da TI

1. Vá no Dashboard do Lovable → **New project**
2. **NÃO ative o Lovable Cloud** (irreversível depois)
3. Dentro do novo projeto: **Connectors** → **Supabase** → **Connect** → selecione o projeto Supabase da TI (`Obesity Care` / `dugoncales IRIS`)
4. O Lovable injeta automaticamente: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

### Passo 3 — Trazer o código deste projeto para o novo

No chat do **novo projeto Lovable** (vazio), digite:

```
@HEALTHBIT copie todo o código deste projeto, exceto a integração Supabase (mantenha a do Supabase da TI já conectado)
```

> Substitua `HEALTHBIT` pelo nome real deste projeto. Para mencionar, digite `@` e selecione na lista.

A IA do novo projeto vai:
- Copiar `src/components`, `src/routes`, `src/hooks`, `src/lib`, `src/styles.css`, etc.
- **Não** copiar `src/integrations/supabase/` (será regenerado pelo connector da TI)
- Copiar `package.json`, `vite.config.ts`, `tsconfig.json`, etc.

---

### Passo 4 — Criar o primeiro admin

Depois que o código subir e a app abrir:

1. Acesse `/login` na nova URL e **faça signup** com seu email
2. No painel Supabase da TI: **Authentication → Users** → copie o `User UID` do seu usuário recém-criado
3. **SQL Editor** → rode:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-UUID-AQUI', 'admin')
ON CONFLICT DO NOTHING;
```

> Observação: o trigger `handle_new_user_role` está definido no código, mas o trigger em si **não existe** no banco da TI (o painel mostra "There are no triggers"). Isso significa que novos usuários **não** ganham role `gestor` automaticamente. Se quiser esse comportamento, eu te passo o SQL para criar o trigger em `auth.users` no próximo passo.

---

### Passo 5 — Testar checklist

- [ ] Login com email funciona
- [ ] Aparece como admin no `/admin`
- [ ] CRUD de participantes funciona
- [ ] Adicionar medições funciona
- [ ] Dashboard renderiza dados

---

## Onde você está agora

Recomendo começar pelo **Passo 2** (criar o projeto novo) — assim você já tem a URL para usar no Passo 1.2 (URL Configuration). Depois volta para o Passo 1, faz o Passo 3 e termina com 4 e 5.

**Me avisa quando o novo projeto estiver criado e o Supabase da TI conectado nele** — eu fico disponível para ajudar com qualquer travamento, especialmente no `@mention` do Passo 3 e no SQL do trigger se você quiser auto-role para novos usuários.
