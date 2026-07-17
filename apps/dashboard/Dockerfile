FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

ARG VITE_API_URL
ARG VITE_APP_URL
ARG VITE_DASHBOARD_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY apps/dashboard/ ./apps/dashboard/

RUN pnpm --filter @linkify/dashboard build

FROM nginx:alpine
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

RUN <<EOF
cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 5174;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX
EOF

EXPOSE 5174
CMD ["nginx", "-g", "daemon off;"]
