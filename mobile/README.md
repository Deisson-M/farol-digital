# Farol Digital — app mobile

App em **React Native + Expo (SDK 57)** que usa a mesma API e o mesmo banco do site.

## Como rodar

Pré-requisitos: a **API rodando** (`cd api && npm run dev`) e o app **Expo Go** (SDK 57) no celular.

```bash
cd mobile
npm i
npm start          # ou: npx expo start
```

Leia o QR Code com o Expo Go (Android) ou com a câmera (iPhone).

**O celular precisa estar na mesma rede Wi-Fi do computador.** O app descobre sozinho o IP do computador
(o mesmo que aparece no QR Code) e chama a API em `http://<IP>:3333/api/v1`.

Se aparecer "Não foi possível falar com o servidor":
- confira se a API está rodando;
- no Windows, permita o Node.js no Firewall (redes privadas) quando ele perguntar;
- não use o modo `--tunnel`; se precisar, crie um arquivo `.env` com `EXPO_PUBLIC_API_URL=http://SEU_IP:3333/api/v1`
  (veja `.env.example`).

## Telas

| Aba / tela | O que faz |
| ---------- | --------- |
| Início | Busca, números do catálogo, temas, cursos em destaque, dicas de segurança e trilhas |
| Cursos | Catálogo com busca, filtros de preço e nível e rolagem infinita |
| Trilhas | Trilhas por nível |
| Minha conta | Perfil, meus cursos e minhas trilhas com progresso, botão de sair |
| Curso | Detalhes, matrícula grátis; cursos pagos abrem a página de compra do site |
| Trilha | Objetivos, progresso, próxima etapa e sequência de cursos com status |
| Entrar / Criar conta | Login, "esqueci minha senha" e cadastro de aluno ou professor |

Contas de teste: as mesmas do site (`aluno@farol.dev`, senha `Farol@2026dev`).

## Organização

```
app/            telas (Expo Router: cada arquivo é uma rota)
  (tabs)/       abas: início, cursos, trilhas, minha conta
  curso/[id]    detalhe do curso
  trilha/[id]   detalhe da trilha
components/     componentes visuais (botões, campos, cartões)
lib/            API, autenticação, tipos, cores e formatação
```

O token de acesso fica guardado com segurança no aparelho (`expo-secure-store`).
