# Como hospedar o Farol Digital de graça

O GitHub hospeda de graça só **sites estáticos** (GitHub Pages). Ele não roda a API (Node.js) nem o banco
(MySQL). Por isso, a hospedagem gratuita usa três serviços:

| Parte | Onde | Custo |
| ----- | ---- | ----- |
| Site (pasta `web`) | **GitHub Pages** | grátis (repositório público) |
| API (pasta `api`) | **Render** (Free Web Service) | grátis; "dorme" após 15 min sem uso e leva ~1 min para acordar |
| Banco MySQL | **Aiven** (Free MySQL) | grátis; 1 GB, sem cartão |
| App | **Expo EAS** (APK) + **GitHub Releases** | grátis (Android) |

> Faça na ordem abaixo: banco → API → site → app. Cada etapa usa o endereço da anterior.

---

## 1. Colocar o projeto no GitHub

1. Crie uma conta em https://github.com e um repositório **público** (ex.: `farol-digital`).
2. Envie a pasta do projeto (a que tem `api`, `web`, `mobile`). Pelo site: **Add file › Upload files**
   e arraste as pastas, **sem** `node_modules`. Os arquivos `.env` não são enviados (estão no `.gitignore`),
   o que é correto: senhas não vão para o GitHub.

## 2. Banco de dados no Aiven

1. Crie uma conta em https://aiven.io e um serviço **MySQL** no plano **Free**.
2. Quando o serviço ficar "Running", copie da página **Overview**: *Host*, *Port*, *User* (`avnadmin`) e *Password*.
3. No **MySQL Workbench**, crie uma conexão com esses dados. Na aba **SSL**, deixe *Use SSL* como **Require**.
4. Conectado, abra o arquivo **`banco_farol_digital_nuvem.sql`** (*File › Open SQL Script*) e execute tudo (raio ⚡).
   Ele cria o banco `farol_digital` com tabelas, dados, procedures e triggers.
   - Se aparecer erro de privilégio na parte final (*triggers* ou *procedures*), as tabelas e os dados já terão
     sido criados e o sistema funciona normalmente. Anote a mensagem de erro para ajustarmos essa parte.

## 3. API no Render

1. Crie uma conta em https://render.com (pode entrar com o GitHub).
2. **New › Web Service** › escolha o repositório.
3. Preencha:
   - **Root Directory:** `api`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `node dist/server.js`
   - **Instance Type:** Free
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   | ---- | ----- |
   | `NODE_VERSION` | `22` |
   | `NODE_ENV` | `development` (necessário enquanto o pagamento for simulado) |
   | `DATABASE_URL` | `mysql://avnadmin:SENHA@HOST:PORTA/farol_digital` (dados do Aiven) |
   | `DATABASE_SSL` | `true` |
   | `JWT_SECRET` | um texto aleatório com 48+ caracteres |
   | `JWT_EXPIRES_IN` | `2h` |
   | `PAGAMENTOS_PROVEDOR` | `simulado` |
   | `PAGAMENTOS_WEBHOOK_SEGREDO` | outro texto aleatório com 32+ caracteres |
   | `CORS_ORIGINS` | `https://SEU-USUARIO.github.io` |
   | `APP_URL` | `https://SEU-USUARIO.github.io/farol-digital` |

   Para gerar textos aleatórios: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

5. Clique em **Create Web Service**. Quando terminar, teste no navegador:
   `https://SUA-API.onrender.com/health` deve mostrar `{"status":"ok"}`.

## 4. Site no GitHub Pages

1. No repositório: **Settings › Pages › Source: GitHub Actions**.
2. **Settings › Secrets and variables › Actions › aba Variables › New repository variable**:
   - Nome: `VITE_API_URL`
   - Valor: `https://SUA-API.onrender.com/api/v1`
3. Vá em **Actions › Publicar site no GitHub Pages › Run workflow** (ou faça qualquer envio para a branch `main`).
4. Em 2 a 3 minutos o site fica em `https://SEU-USUARIO.github.io/farol-digital/`.

## 5. App (APK para Android)

1. Crie uma conta em https://expo.dev.
2. No arquivo `mobile/eas.json` (ou `mobile-sdk54/eas.json`), troque:
   - `EXPO_PUBLIC_API_URL` pelo endereço da API no Render (`.../api/v1`);
   - `EXPO_PUBLIC_SITE_URL` pelo endereço do site no GitHub Pages.
3. No terminal, dentro da pasta do app:

   ```bash
   npm i
   npx eas-cli login
   npx eas-cli build -p android --profile preview
   ```

4. Ao terminar, o Expo mostra um link para baixar o **APK**. Para deixar no GitHub: no repositório,
   **Releases › Create a new release**, anexe o APK e publique. Esse link pode ir no PIM.
   - No iPhone não é possível instalar APK: use o Expo Go apontando para a API publicada
     (crie `mobile/.env` com `EXPO_PUBLIC_API_URL=https://SUA-API.onrender.com/api/v1` e rode `npm start`).

---

## Dicas para a apresentação

- Abra `https://SUA-API.onrender.com/health` uns 2 minutos antes de apresentar: a API gratuita "acorda" e o
  site responde rápido depois disso.
- Contas de teste: `aluno@farol.dev`, `admin@farol.dev` — senha `Farol@2026dev`.
