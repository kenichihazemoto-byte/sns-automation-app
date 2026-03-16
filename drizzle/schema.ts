import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // ユーザープロフィール情報
  companyName: text("companyName"),
  industry: text("industry"),
  googlePhotoAlbums: text("googlePhotoAlbums"), // JSON配列として保存
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SNS account configuration table
 * Stores API credentials and settings for Instagram, X, and Threads
 */
export const snsAccounts = mysqlTable("sns_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  platform: mysqlEnum("platform", ["instagram", "x", "threads"]).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountId: varchar("accountId", { length: 255 }),
  apiKey: text("apiKey"),
  apiSecret: text("apiSecret"),
  accessToken: text("accessToken"),
  accessTokenSecret: text("accessTokenSecret"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SnsAccount = typeof snsAccounts.$inferSelect;
export type InsertSnsAccount = typeof snsAccounts.$inferInsert;

/**
 * Cloud storage configuration table
 * Stores API credentials for Google Drive or Dropbox
 */
export const cloudStorageConfigs = mysqlTable("cloud_storage_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["google_drive", "dropbox"]).notNull(),
  folderPath: text("folderPath").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CloudStorageConfig = typeof cloudStorageConfigs.$inferSelect;
export type InsertCloudStorageConfig = typeof cloudStorageConfigs.$inferInsert;

/**
 * Image management table
 * Tracks images from cloud storage and their analysis results
 */
export const images = mysqlTable("images", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cloudStorageConfigId: int("cloudStorageConfigId").notNull(),
  originalUrl: text("originalUrl").notNull(),
  s3Url: text("s3Url"),
  s3Key: text("s3Key"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  analysisResult: text("analysisResult"),
  imageCategory: varchar("imageCategory", { length: 100 }),
  imageStyle: varchar("imageStyle", { length: 100 }),
  tags: text("tags"), // JSON array of tags extracted from AI analysis
  isUsed: boolean("isUsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;

/**
 * Post schedule table
 * Stores scheduled posts with AI-generated content
 */
export const postSchedules = mysqlTable("post_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageId: int("imageId"),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  cronExpression: varchar("cronExpression", { length: 100 }),
  status: mysqlEnum("status", ["draft", "scheduled", "active", "pending", "processing", "completed", "failed", "cancelled", "published"]).default("draft").notNull(),
  lastExecutedAt: timestamp("lastExecutedAt"),
  // リマインダー通知用
  notificationSent: boolean("notificationSent").default(false).notNull(),
  reminderSentAt: timestamp("reminderSentAt"),
  // ビフォーアフター投稿用
  isBeforeAfter: boolean("isBeforeAfter").default(false).notNull(),
  beforeImageUrl: text("beforeImageUrl"),
  afterImageUrl: text("afterImageUrl"),
  // Notion連携用
  notionPageId: varchar("notionPageId", { length: 255 }),
  notionSyncedAt: timestamp("notionSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostSchedule = typeof postSchedules.$inferSelect;
export type InsertPostSchedule = typeof postSchedules.$inferInsert;

/**
 * Post content table
 * Stores platform-specific content for each scheduled post
 */
export const postContents = mysqlTable("post_contents", {
  id: int("id").autoincrement().primaryKey(),
  postScheduleId: int("postScheduleId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "x", "threads"]).notNull(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostContent = typeof postContents.$inferSelect;
export type InsertPostContent = typeof postContents.$inferInsert;

/**
 * Post history table
 * Tracks published posts and their results
 */
export const postHistory = mysqlTable("post_history", {
  id: int("id").autoincrement().primaryKey(),
  postScheduleId: int("postScheduleId").notNull(),
  postContentId: int("postContentId"),
  platform: mysqlEnum("platform", ["instagram", "x", "threads"]).notNull(),
  postId: varchar("postId", { length: 255 }),
  postUrl: text("postUrl"),
  status: mysqlEnum("status", ["published", "failed"]).notNull(),
  errorMessage: text("errorMessage"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostHistoryRecord = typeof postHistory.$inferSelect;
export type InsertPostHistory = typeof postHistory.$inferInsert;

/**
 * Analytics table
 * Stores engagement metrics for published posts
 */
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  postHistoryId: int("postHistoryId").notNull(),
  likes: int("likes").default(0).notNull(),
  comments: int("comments").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  views: int("views").default(0).notNull(),
  engagementRate: int("engagementRate").default(0).notNull(), // (likes + comments + shares) / views * 10000 (stored as basis points)
  hourOfDay: int("hourOfDay"), // Hour when the post was published (0-23)
  dayOfWeek: int("dayOfWeek"), // Day of week when published (0=Sunday, 6=Saturday)
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;

/**
 * Comment management table
 * Stores comments from social media posts
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postHistoryId: int("postHistoryId").notNull(),
  platformCommentId: varchar("platformCommentId", { length: 255 }).notNull(),
  authorName: varchar("authorName", { length: 255 }),
  content: text("content").notNull(),
  replyStatus: mysqlEnum("replyStatus", ["pending", "replied", "ignored"]).default("pending").notNull(),
  replyContent: text("replyContent"),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Custom templates table
 * Stores user-customized post templates
 */
export const customTemplates = mysqlTable("custom_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  baseTemplateId: varchar("baseTemplateId", { length: 100 }), // null for completely custom templates
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  structure: text("structure").notNull(), // JSON: { opening, body, cta }
  hashtags: text("hashtags").notNull(), // Comma-separated hashtags
  targetAudience: text("targetAudience"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomTemplate = typeof customTemplates.$inferSelect;
export type InsertCustomTemplate = typeof customTemplates.$inferInsert;

/**
 * Draft posts table for approval workflow
 * Stores posts created by users that require approval before scheduling
 */
export const draftPosts = mysqlTable("draft_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageId: int("imageId"),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  platform: mysqlEnum("platform", ["instagram", "x", "threads"]).notNull(),
  postContent: text("postContent").notNull(),
  hashtags: text("hashtags").notNull(), // JSON array
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  isBeforeAfter: boolean("isBeforeAfter").default(false).notNull(),
  beforeImageUrl: text("beforeImageUrl"),
  afterImageUrl: text("afterImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DraftPost = typeof draftPosts.$inferSelect;
export type InsertDraftPost = typeof draftPosts.$inferInsert;

/**
 * Approval history table
 * Records approval/rejection actions and feedback from supervisors
 */
export const approvalHistory = mysqlTable("approval_history", {
  id: int("id").autoincrement().primaryKey(),
  draftPostId: int("draftPostId").notNull(),
  reviewerId: int("reviewerId").notNull(), // admin user id
  action: mysqlEnum("action", ["approved", "rejected"]).notNull(),
  feedback: text("feedback"), // Feedback message for rejected posts
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = typeof approvalHistory.$inferInsert;

/**
 * Post templates table
 * Stores reusable post templates with predefined settings
 */
export const postTemplates = mysqlTable("post_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  businessUnit: varchar("businessUnit", { length: 100 }), // 事業区分（建設本業/ラトリエルアッシュ/子ども食堂/就労支援B型/診療案内/健康情報/スタッフ紹介）
  isBeforeAfter: boolean("isBeforeAfter").default(false).notNull(),
  // プラットフォーム別投稿文テンプレート
  instagramCaption: text("instagramCaption"),
  instagramHashtags: text("instagramHashtags"),
  xCaption: text("xCaption"),
  xHashtags: text("xHashtags"),
  threadsCaption: text("threadsCaption"),
  threadsHashtags: text("threadsHashtags"),
  // デフォルト投稿時刻（HH:MM形式）
  defaultPostTime: varchar("defaultPostTime", { length: 5 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostTemplate = typeof postTemplates.$inferSelect;
export type InsertPostTemplate = typeof postTemplates.$inferInsert;

/**
 * Post drafts table
 * Stores draft posts that users can save and edit before scheduling
 */
export const postDrafts = mysqlTable("post_drafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  title: varchar("title", { length: 255 }),
  isBeforeAfter: boolean("isBeforeAfter").default(false).notNull(),
  beforeImageUrl: text("beforeImageUrl"),
  afterImageUrl: text("afterImageUrl"),
  imageUrl: text("imageUrl"), // For regular posts
  // プラットフォーム別投稿内容
  instagramContent: text("instagramContent"),
  instagramHashtags: text("instagramHashtags"),
  xContent: text("xContent"),
  xHashtags: text("xHashtags"),
  threadsContent: text("threadsContent"),
  threadsHashtags: text("threadsHashtags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostDraft = typeof postDrafts.$inferSelect;
export type InsertPostDraft = typeof postDrafts.$inferInsert;

/**
 * Data sources table
 * Stores configuration for various photo data sources (Google Photos, Dropbox, OneDrive, etc.)
 */
export const dataSources = mysqlTable("data_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name for the source
  provider: mysqlEnum("provider", ["google_photos", "dropbox", "onedrive", "local"]).notNull(),
  // Connection credentials (encrypted)
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  // Provider-specific settings
  albumId: varchar("albumId", { length: 255 }), // For Google Photos
  folderId: varchar("folderId", { length: 255 }), // For Dropbox/OneDrive
  folderPath: text("folderPath"), // For local or path-based sources
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;

/**
 * Template data sources table
 * Links templates to their photo data sources with priority ordering
 */
export const templateDataSources = mysqlTable("template_data_sources", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  dataSourceId: int("dataSourceId").notNull(),
  priority: int("priority").default(0).notNull(), // Lower number = higher priority (0 is highest)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplateDataSource = typeof templateDataSources.$inferSelect;
export type InsertTemplateDataSource = typeof templateDataSources.$inferInsert;

/**
 * User activity log table
 * Records all actions performed by users for tracking and skill improvement
 */
export const userActivityLog = mysqlTable("user_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", [
    "photo_upload",
    "photo_fetch",
    "post_generation",
    "post_generate",
    "draft_create",
    "draft_save",
    "schedule_create",
    "post_approval",
    "post_rejection",
    "post_schedule",
    "post_publish",
    "template_create",
    "template_edit",
  ]).notNull(),
  details: text("details"), // JSON: additional information about the activity
  status: mysqlEnum("status", ["success", "failed"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;

/**
 * User feedback table
 * Stores feedback from supervisors to help users improve their skills
 */
export const userFeedback = mysqlTable("user_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User receiving the feedback
  supervisorId: int("supervisorId").notNull(), // Admin providing the feedback
  activityLogId: int("activityLogId"), // Optional reference to specific activity
  feedbackType: mysqlEnum("feedbackType", ["praise", "suggestion", "correction"]).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;

/**
 * Upload history table
 * Stores sets of uploaded photos for reuse
 */
export const uploadHistory = mysqlTable("upload_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: text("companyName"),
  title: varchar("title", { length: 255 }),
  photoCount: int("photoCount").notNull(),
  photoData: text("photoData").notNull(), // JSON array of photo objects
  tags: text("tags"), // JSON array of tags for filtering
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = typeof uploadHistory.$inferInsert;

/**
 * Favorite images table
 * Stores user's favorite images with AI analysis for later reuse
 */
export const favoriteImages = mysqlTable("favorite_images", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]).notNull(),
  imageUrl: text("imageUrl").notNull(),
  score: int("score"), // AI score (0-100)
  analysis: text("analysis"), // JSON string of AI analysis
  tags: text("tags"), // Comma-separated tags
  title: text("title"), // Optional user-defined title
  notes: text("notes"), // Optional user notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FavoriteImage = typeof favoriteImages.$inferSelect;
export type InsertFavoriteImage = typeof favoriteImages.$inferInsert;

/**
 * エラーログテーブル
 * 写真取得やAI分析のエラーを記録
 */
export const errorLogs = mysqlTable("errorLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  errorType: varchar("errorType", { length: 100 }).notNull(), // "network", "album_access", "no_photos", "ai_analysis", "unknown"
  errorReason: varchar("errorReason", { length: 255 }).notNull(),
  errorDetails: text("errorDetails"),
  context: text("context"), // JSON string with additional context (e.g., photo index, album info)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

/**
 * Template performance statistics table
 * Tracks post generation success/failure rates for each template-datasource combination
 */
export const templatePerformanceStats = mysqlTable("template_performance_stats", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(), // References customTemplates.id
  dataSourceId: int("dataSourceId"), // References dataSources.id, null if no datasource used
  generationDate: timestamp("generationDate").notNull(), // Date when post was generated
  totalAttempts: int("totalAttempts").default(0).notNull(), // Total generation attempts
  successCount: int("successCount").default(0).notNull(), // Successful generations
  failureCount: int("failureCount").default(0).notNull(), // Failed generations
  platform: mysqlEnum("platform", ["instagram", "x", "threads"]), // Target platform
  companyName: mysqlEnum("companyName", ["ハゼモト建設", "クリニックアーキプロ"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplatePerformanceStat = typeof templatePerformanceStats.$inferSelect;
export type InsertTemplatePerformanceStat = typeof templatePerformanceStats.$inferInsert;

/**
 * ユーザーバッジテーブル
 * 達成バッジシステム用
 */
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeType: varchar("badgeType", { length: 64 }).notNull(), // "first_post", "10_posts", "week_5_posts", "quality_master", "streak_7"
  badgeName: varchar("badgeName", { length: 128 }).notNull(),
  badgeDescription: text("badgeDescription"),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

/**
 * 今日のタスク進捗テーブル
 * 利用者さんの日次タスク達成状況を記録
 */
export const dailyTaskProgress = mysqlTable("daily_task_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskDate: timestamp("taskDate").notNull(), // 対象日
  targetPostCount: int("targetPostCount").default(1).notNull(), // 今日の目標投稿数
  completedPostCount: int("completedPostCount").default(0).notNull(), // 達成した投稿数
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyTaskProgress = typeof dailyTaskProgress.$inferSelect;
export type InsertDailyTaskProgress = typeof dailyTaskProgress.$inferInsert;

// Notion連携設定テーブル
export const notionSettings = mysqlTable("notion_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  integrationToken: text("integrationToken").notNull(),
  databaseId: varchar("databaseId", { length: 64 }).notNull(),
  databaseTitle: varchar("databaseTitle", { length: 255 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotionSetting = typeof notionSettings.$inferSelect;
export type InsertNotionSetting = typeof notionSettings.$inferInsert;

/**
 * Googleビジネスプロフィール（GBP）アカウント連携テーブル
 * 各拠点のGoogleアカウントOAuth2トークンを保管
 */
export const gbpAccounts = mysqlTable("gbp_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 拠点名（表示用） */
  locationName: varchar("locationName", { length: 255 }).notNull(),
  /** Google My Business アカウントID（例: accounts/12345678） */
  accountId: varchar("accountId", { length: 128 }),
  /** Google My Business ロケーションID（例: locations/87654321） */
  locationId: varchar("locationId", { length: 128 }),
  /** OAuth2 アクセストークン */
  accessToken: text("accessToken"),
  /** OAuth2 リフレッシュトークン */
  refreshToken: text("refreshToken"),
  /** トークン有効期限 */
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  /** 接続ステータス */
  isConnected: boolean("isConnected").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GbpAccount = typeof gbpAccounts.$inferSelect;
export type InsertGbpAccount = typeof gbpAccounts.$inferInsert;

/**
 * GBP投稿履歴テーブル
 * Googleビジネスプロフィールへの投稿記録
 */
export const gbpPosts = mysqlTable("gbp_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  gbpAccountId: int("gbpAccountId").notNull(),
  /** 投稿タイプ: standard=通常投稿, event=イベント, offer=特典 */
  topicType: mysqlEnum("topicType", ["STANDARD", "EVENT", "OFFER"]).default("STANDARD").notNull(),
  /** 投稿本文 */
  summary: text("summary").notNull(),
  /** 添付画像URL（S3またはGoogleフォト） */
  mediaUrl: text("mediaUrl"),
  /** CTAボタンタイプ */
  callToActionType: mysqlEnum("callToActionType", ["BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP", "CALL"]),
  /** CTAリンクURL */
  callToActionUrl: text("callToActionUrl"),
  /** イベントタイトル（topicType=EVENTの場合） */
  eventTitle: varchar("eventTitle", { length: 255 }),
  /** イベント開始日時 */
  eventStartAt: timestamp("eventStartAt"),
  /** イベント終了日時 */
  eventEndAt: timestamp("eventEndAt"),
  /** GBP側で発行された投稿ID */
  gbpPostId: varchar("gbpPostId", { length: 255 }),
  /** 投稿ステータス */
  status: mysqlEnum("status", ["draft", "published", "failed"]).default("draft").notNull(),
  /** 流用元のSNS投稿ID（post_schedulesのID） */
  sourceScheduleId: int("sourceScheduleId"),
  /** エラーメッセージ（失敗時） */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GbpPost = typeof gbpPosts.$inferSelect;
export type InsertGbpPost = typeof gbpPosts.$inferInsert;
