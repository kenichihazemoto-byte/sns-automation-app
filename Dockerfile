# syntax=docker/dockerfile:1.7

# =========================================
# Stage 1: deps - 依存関係のインストール
# =========================================
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# =========================================
# Stage 2: build - フロント・サーバーのビルド
# =========================================
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ビルド時にもプレースホルダが必要（Vite が index.html を処理するため）
ENV VITE_APP_TITLE="ハゼモト業務"
ENV VITE_APP_LOGO="/icon.svg"

RUN pnpm build

# =========================================
# Stage 3: runner - 本番ランタイム
# =========================================
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 本番依存のみインストール
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ビルド成果物とマイグレーションをコピー
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/shared ./shared
COPY drizzle.config.ts ./

# 非rootユーザーで起動
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
