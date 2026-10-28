# Farol Digital

Escola on-line de cultura digital: cursos e trilhas de aprendizagem sobre informática, celular, segurança,
privacidade, produtividade, finanças, inteligência artificial e programação.

| Camada   | Tecnologia                                                |
| -------- | --------------------------------------------------------- |
| API      | Fastify 5 + TypeScript, validação com Zod, autenticação JWT |
| Banco    | MySQL 8 + Drizzle ORM                                      |
| Frontend | React 19 + TypeScript + Vite, React Router, Axios          |
| Mobile   | React Native + Expo SDK 57 (Expo Router), Expo Go          |
| Testes   | `node:test` (API) · Vitest + Testing Library (frontend)    |

## Como executar

Pré-requisitos: **Node.js 20.11+** e **MySQL 8**.

### 1. Banco de dados

Importe o arquivo `banco_farol_digital.sql` (fica ao lado desta pasta) como **root**:

- **MySQL Workbench:** *Server › Data Import › Import from Self-Contained File* e selecione o arquivo; ou
- **Terminal:** `mysql -u root -p < banco_farol_digital.sql`

O script cria o banco `farol_digital`, o usuário `farol` (senha `123456`), todas as tabelas e os dados de
demonstração. Se preferir usar outro usuário, altere `DATABASE_URL` em `api/.env`.

### 2. API (terminal 1)

```bash
cd api
npm i
npm run dev        # http://localhost:3333
```

### 3. Site (terminal 2)

```bash
cd web
npm i
npm run dev        # http://localhost:5173
```

### 4. App mobile (opcional, terminal 3)

```bash
cd mobile
npm i
npm start          # leia o QR Code com o Expo Go (SDK 57)
```

O celular precisa estar na mesma rede Wi-Fi do computador. Detalhes em `mobile/README.md`.

Se o Expo Go do celular for do **SDK 54**, use a pasta `mobile-sdk54` no lugar de `mobile` (mesmas telas e os mesmos comandos).

> Os arquivos `.env` já estão configurados. Opcionalmente, `npm run db:seed` (dentro de `api`) recria os dados
> de demonstração a partir de `api/src/db/dados-seed.json`.

## Contas de demonstração

Senha de todas: **`Farol@2026dev`**

| Perfil | E-mail |
| ------ | ------ |
| Administração | `admin@farol.dev` |
| Coordenação | `coordenacao@farol.dev` |
| Professora (aprovada) | `professora@farol.dev` |
| Professor (aprovado) | `professor2@farol.dev` |
| Professor aguardando aprovação | `professor.pendente@farol.dev` |
| Aluno com cursos em andamento | `aluno@farol.dev` |
| Aluna com cursos em andamento | `aluna2@farol.dev` |
| Aluno sem matrículas | `aluno3@farol.dev` |

## Conteúdo

- **34 cursos**: 25 gratuitos (iniciante e intermediário) e 9 avançados pagos.
- **13 trilhas** de aprendizagem, entre elas *Celular e comunicação no dia a dia*, *Produtividade com ferramentas
  digitais* (conclusão com 75% dos cursos), *Finanças digitais com segurança*, *Carreira e negócios digitais* e
  *Primeiros passos em programação*.

## Telas

| Rota | Tela |
| ---- | ---- |
| `/` | Página inicial: busca, números do catálogo, temas, quem somos, etapas, cursos e trilhas em destaque, dúvidas |
| `/cadastro` | Cadastro de aluno ou professor (`/cadastro?tipo=professor` já marca professor) |
| `/entrar`, `/esqueci-senha`, `/redefinir-senha?token=…` | Entrada e recuperação de senha |
| `/cursos`, `/cursos/:id` | Catálogo com busca e filtros; detalhe com matrícula gratuita ou compra |
| `/trilhas`, `/trilhas/:id` | Trilhas, sequência de cursos e progresso |
| `/meus-cursos`, `/minhas-trilhas` | Área do aluno |
| `/checkout/:codigo` | Pagamento (crédito, débito, Pix, boleto, PayPal, Google Pay/Apple Pay) |
| `/admin/trilhas`, `/admin/professores` | Gestão de trilhas e aprovação de professores |
| `/termos` | Termos de Uso e Aviso de Privacidade (modelo) |

### Pagamentos (simulados)

Nenhuma cobrança real acontece. Cartão `4242 4242 4242 4242` aprova e `4000 0000 0000 0002` recusa.
Pix, boleto e PayPal ficam pendentes e têm o botão **Simular pagamento confirmado**.

### Recuperação de senha

Sem provedor de e-mail configurado, o link de redefinição aparece no terminal da API
(procure por `[DEV] Link de redefinição`).

## Comandos úteis

```bash
cd api && npm run typecheck && npm test
cd web && npm run typecheck && npm test && npm run build
```
