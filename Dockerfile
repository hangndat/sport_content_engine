# Sport Content Engine – multi-stage build

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY admin/package.json admin/package-lock.json ./admin/
RUN npm ci --prefix admin

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/admin/node_modules ./admin/node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install drizzle-kit tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin/dist ./admin/dist
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY drizzle.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.js"]
