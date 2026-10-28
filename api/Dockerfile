# Imagem da API do Farol Digital (build em duas etapas).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
# As variáveis (DATABASE_URL, JWT_SECRET, PAGAMENTOS_WEBHOOK_SEGREDO...) vêm do provedor de nuvem.
# Atenção: com NODE_ENV=production a API exige um gateway de pagamento real.
EXPOSE 3333
USER node
CMD ["node", "dist/server.js"]
