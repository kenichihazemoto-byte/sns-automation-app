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
