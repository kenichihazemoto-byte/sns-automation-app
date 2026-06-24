export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Manus Forge（既定）
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // LLM プロバイダー直接接続（Manus環境外向け）
  // "forge" (default) | "openai" | "gemini"
  llmProvider: (process.env.LLM_PROVIDER ?? "forge") as
    | "forge"
    | "openai"
    | "gemini",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  // ストレージプロバイダー直接接続（Manus環境外向け）
  // "forge" (default) | "s3"
  storageProvider: (process.env.STORAGE_PROVIDER ?? "forge") as "forge" | "s3",
  storageS3Bucket: process.env.STORAGE_S3_BUCKET ?? "",
  storageS3Region: process.env.STORAGE_S3_REGION ?? "ap-northeast-1",
  storageS3AccessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID ?? "",
  storageS3SecretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY ?? "",
  storageS3Endpoint: process.env.STORAGE_S3_ENDPOINT ?? "",
  storageS3PublicUrlBase: process.env.STORAGE_S3_PUBLIC_URL_BASE ?? "",
};
