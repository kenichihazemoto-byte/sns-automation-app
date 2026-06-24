# 本番デプロイ手順書

ハゼモト業務アプリを Manus 環境外（自社サーバー / クラウド）へデプロイするための完全ガイドです。

---

## 目次
1. [構成の全体像](#1-構成の全体像)
2. [必要な環境変数](#2-必要な環境変数)
3. [Docker Compose で起動（最短）](#3-docker-compose-で起動最短)
4. [Dockerだけで起動](#4-dockerだけで起動)
5. [Vercel + Railway 構成](#5-vercel--railway-構成)
6. [AWS 構成](#6-aws-構成)
7. [DBマイグレーション](#7-dbマイグレーション)
8. [認証（OAuth）の差し替え](#8-認証oauthの差し替え)
9. [運用Tips](#9-運用tips)

---

## 1. 構成の全体像

```
[ブラウザ・スマホ]
     │ HTTPS
     ▼
[アプリ（Express + Vite 静的ファイル）] ← Port 3000
     │
     ├─→ [MySQL]                    ← データ永続化
     ├─→ [LLM API]                  ← 写真解析・投稿生成
     │     - Manus Forge（既定）
     │     - OpenAI API（直接）
     │     - Google Gemini API（直接）
     └─→ [画像ストレージ]            ← 写真ファイル保管
           - Manus Forge（既定）
           - AWS S3 / S3互換
```

最小構成: **アプリコンテナ1台 + MySQL** で動作します。

---

## 2. 必要な環境変数

`.env.example` をコピーして `.env` を作成し、値を埋めてください。

### 必須
| 変数 | 説明 | 例 |
|---|---|---|
| `DATABASE_URL` | MySQL接続文字列 | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | セッション署名鍵（32文字以上ランダム） | `openssl rand -hex 32` で生成 |
| `VITE_APP_TITLE` | アプリ画面のタイトル | `ハゼモト業務` |

### LLM プロバイダー設定（いずれか1つ）
| パターン | 変数 | 補足 |
|---|---|---|
| **Manus Forge（既定）** | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Manus契約が必要 |
| **OpenAI 直接** | `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o` | 自社契約のOpenAIキー |
| **Google Gemini 直接** | `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.0-flash` | Google AI Studio で発行 |

### ストレージプロバイダー設定（いずれか1つ）
| パターン | 変数 |
|---|---|
| **Manus Forge（既定）** | 上記のForge設定を流用 |
| **AWS S3 / S3互換** | `STORAGE_PROVIDER=s3`, `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY` |

### 認証（Manus OAuth を使う場合）
| 変数 | 説明 |
|---|---|
| `VITE_APP_ID` | Manus 発行のアプリID |
| `VITE_OAUTH_PORTAL_URL` | `https://oauth.manus.im` |
| `OAUTH_SERVER_URL` | 同上 |
| `OWNER_OPEN_ID` | 社長アカウントのOpenID |

---

## 3. Docker Compose で起動（最短）

最も簡単な方法。MySQL も同梱で起動します。

```bash
# 1. リポジトリをクローン
git clone https://github.com/kenichihazemoto-byte/sns-automation-app.git
cd sns-automation-app
git checkout claude/building-inspection-crack-detection-Hh6uq

# 2. .env を作成
cp .env.example .env
# .env を編集して JWT_SECRET, LLM API キー等を設定

# 3. 起動
docker compose up -d --build

# 4. 初回のみ DBマイグレーション
docker compose exec app pnpm exec drizzle-kit migrate

# 5. ブラウザで http://サーバーIP:3000 を開く
```

更新時:
```bash
git pull
docker compose up -d --build
```

停止:
```bash
docker compose down       # データは残る
docker compose down -v    # データも全削除
```

---

## 4. Dockerだけで起動

外部MySQLを既に持っている場合。

```bash
# ビルド
docker build -t hazemoto-app .

# 起動
docker run -d \
  --name hazemoto-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  hazemoto-app

# ログ確認
docker logs -f hazemoto-app
```

---

## 5. Vercel + Railway 構成

フロントエンドは Vercel、API + DB は Railway で動かす構成も可能ですが、本リポジトリは**フロントとAPIが一体のExpressアプリ**のため、Vercel単体での運用は推奨しません。

代替案:
- **Railway / Render / Fly.io** に Dockerfile をデプロイ → MySQLアドオン併用（最も簡単）
- **Cloud Run（GCP）** → Cloud SQL（MySQL）

例: Railwayへのデプロイ
```
1. Railway で新規プロジェクト作成
2. GitHub リポジトリを連携
3. MySQL プラグインを追加
4. 環境変数を設定（.env.example 参照）
5. デプロイ → 自動的にURLが発行される
```

---

## 6. AWS 構成

本格運用向け推奨構成:

```
[Route 53] → [ALB] → [ECS Fargate (Dockerイメージ)]
                              │
                              ├─→ [Aurora MySQL]
                              └─→ [S3 (画像保管)]
```

手順概要:
1. ECR に Docker イメージを push
2. RDS / Aurora で MySQL インスタンスを作成
3. S3バケットを作成（パブリック読み取り or 署名URL）
4. ECS タスク定義を作成し、環境変数を Secrets Manager 経由で注入
5. ALB を作成し、HTTPSリスナーで ACM 証明書を割り当て
6. Route 53 で独自ドメイン（例: `inspection.hazemoto.co.jp`）を ALB に向ける

---

## 7. DBマイグレーション

スキーマ変更を反映する手順:

```bash
# Dockerなしの場合
pnpm db:push

# Docker Composeの場合
docker compose exec app pnpm exec drizzle-kit migrate

# Dockerだけの場合
docker exec -it hazemoto-app pnpm exec drizzle-kit migrate
```

> ⚠️ 本番DBに対しては `drizzle-kit push` ではなく `migrate` を使ってください（差分検出より安全です）。

新規テーブル追加時は `drizzle/0032_inspection_tables.sql` 形式のマイグレーションSQLファイルを `drizzle/` に追加します。

---

## 8. 認証（OAuth）の差し替え

現状は Manus OAuth に依存しています。Manus 環境外で運用する場合、いずれかへの差し替えが必要です。

### A. Manus OAuth をそのまま使う（最小工数）
- Manus との契約継続が前提
- `VITE_APP_ID` / `VITE_OAUTH_PORTAL_URL` / `OAUTH_SERVER_URL` を設定するだけ

### B. Google Workspace 認証への差し替え
- 社内 Google アカウントでログイン
- 実装変更箇所:
  - `server/_core/sdk.ts`（トークン交換 → Google OAuth2 へ）
  - `server/_core/oauth.ts`（コールバック処理）
  - `client/src/const.ts` の `getLoginUrl`

### C. 簡易パスワード認証への差し替え
- 担当者全員でID/PASS を共有（推奨されません）
- 実装変更: 認証ミドルウェアと簡易ログインフォームの追加

> 認証差し替えは別途設計が必要です。実装ご希望の場合はご相談ください。

---

## 9. 運用Tips

### バックアップ
```bash
# MySQL ダンプ（Docker Composeの場合）
docker compose exec mysql mysqldump -u root -p hazemoto > backup_$(date +%Y%m%d).sql

# S3 → ローカル
aws s3 sync s3://hazemoto-app /backup/s3/
```

### ヘルスチェック
- エンドポイント: `GET /api/health`
- 期待レスポンス: `{"status":"ok","uptime":...,"timestamp":"..."}`
- Docker / k8s / ALB のヘルスチェックに利用可能

### ログ確認
```bash
docker compose logs -f app
```

### コンテナ更新時のダウンタイム最小化
ロードバランサ配下に複数台配置するか、`docker compose up -d --no-deps --build app` でアプリのみ再ビルド。

### モニタリング推奨
- アプリ: Uptime Robot / Pingdom など（`/api/health` を監視）
- DB: RDS/Aurora のメトリクス
- LLM API: 各プロバイダーの使用量ダッシュボード

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| 起動直後に `LLM not configured` | LLM環境変数未設定 | `BUILT_IN_FORGE_API_KEY` か `OPENAI_API_KEY` か `GEMINI_API_KEY` を設定 |
| 起動直後に `DATABASE_URL is required` | DB接続文字列未設定 | `DATABASE_URL` を設定 |
| 写真アップロードでエラー | S3権限・バケット名 | `STORAGE_S3_BUCKET` を確認、IAMポリシーで `s3:PutObject` 許可 |
| ログインしてもループする | `OAUTH_SERVER_URL` / `VITE_OAUTH_PORTAL_URL` 不一致 | 両方を同じ値に揃える |
| マイグレーション失敗 | DB未作成 | MySQLに `hazemoto` データベースを先に作る |

---

最終更新: 2026-06-24
