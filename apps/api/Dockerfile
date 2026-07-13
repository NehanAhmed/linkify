FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @linkify/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
