import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  snsAccounts,
  InsertSnsAccount,
  SnsAccount,
  cloudStorageConfigs,
  InsertCloudStorageConfig,
  CloudStorageConfig,
  images,
  InsertImage,
  Image,
  postSchedules,
  InsertPostSchedule,
  PostSchedule,
  postContents,
  InsertPostContent,
  PostContent,
  postHistory,
  InsertPostHistory,
  PostHistoryRecord,
  analytics,
  InsertAnalytics,
  Analytics,
  comments,
  InsertComment,
  Comment,
  draftPosts,
  uploadHistory,
  InsertUploadHistory,
  UploadHistory,
  InsertDraftPost,
  DraftPost,
  approvalHistory,
  InsertApprovalHistory,
  ApprovalHistory,
  userActivityLog,
  InsertUserActivityLog,
  UserActivityLog,
  userFeedback,
  InsertUserFeedback,
  UserFeedback,
  favoriteImages,
  InsertFavoriteImage,
  FavoriteImage,
  errorLogs,
  InsertErrorLog,
  ErrorLog,
  postTemplates,
  InsertPostTemplate,
  PostTemplate,
  postDrafts,
  InsertPostDraft,
  PostDraft,
  dataSources,
  InsertDataSource,
  DataSource,
  templateDataSources,
  InsertTemplateDataSource,
  TemplateDataSource,
  templatePerformanceStats,
  InsertTemplatePerformanceStat,
  TemplatePerformanceStat,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(userId: number, updates: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

// SNS Accounts
export async function createSnsAccount(account: InsertSnsAccount): Promise<SnsAccount> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(snsAccounts).values(account);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(snsAccounts).where(eq(snsAccounts.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getSnsAccountsByUserId(userId: number): Promise<SnsAccount[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(snsAccounts).where(eq(snsAccounts.userId, userId));
}

export async function updateSnsAccount(id: number, updates: Partial<InsertSnsAccount>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(snsAccounts).set(updates).where(eq(snsAccounts.id, id));
}

export async function deleteSnsAccount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(snsAccounts).where(eq(snsAccounts.id, id));
}

// Cloud Storage Configs
export async function createCloudStorageConfig(config: InsertCloudStorageConfig): Promise<CloudStorageConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(cloudStorageConfigs).values(config);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(cloudStorageConfigs).where(eq(cloudStorageConfigs.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getCloudStorageConfigsByUserId(userId: number): Promise<CloudStorageConfig[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(cloudStorageConfigs).where(eq(cloudStorageConfigs.userId, userId));
}

export async function updateCloudStorageConfig(id: number, updates: Partial<InsertCloudStorageConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(cloudStorageConfigs).set(updates).where(eq(cloudStorageConfigs.id, id));
}

// Images
export async function createImage(image: InsertImage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(images).values(image);
  const insertedId = Number(result[0].insertId);
  
  return insertedId;
}

export async function getImagesByUserId(userId: number, limit = 50): Promise<Image[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(images)
    .where(eq(images.userId, userId))
    .orderBy(desc(images.createdAt))
    .limit(limit);
}

export async function getUnusedImages(userId: number, limit = 10): Promise<Image[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(images)
    .where(and(eq(images.userId, userId), eq(images.isUsed, false)))
    .orderBy(desc(images.createdAt))
    .limit(limit);
}

export async function markImageAsUsed(imageId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(images).set({ isUsed: true }).where(eq(images.id, imageId));
}

// Post Schedules
export async function createPostSchedule(schedule: InsertPostSchedule): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(postSchedules).values(schedule);
  const insertedId = Number(result[0].insertId);
  
  return insertedId;
}

export async function getPostSchedulesByUserId(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // post_schedulesとpost_contentsをJOINして投稿内容も取得
  const schedules = await db.select().from(postSchedules)
    .where(eq(postSchedules.userId, userId))
    .orderBy(desc(postSchedules.scheduledAt));
  
  // 各スケジュールに対して投稿内容を取得
  const schedulesWithContents = await Promise.all(
    schedules.map(async (schedule) => {
      const contents = await db.select().from(postContents)
        .where(eq(postContents.postScheduleId, schedule.id));
      return {
        ...schedule,
        contents,
      };
    })
  );
  
  return schedulesWithContents;
}

export async function updatePostScheduleStatus(id: number, status: "pending" | "processing" | "published" | "failed" | "cancelled"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(postSchedules).set({ status }).where(eq(postSchedules.id, id));
}

export async function getPostScheduleById(id: number): Promise<PostSchedule | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select().from(postSchedules).where(eq(postSchedules.id, id)).limit(1);
  return results.length > 0 ? results[0] : undefined;
}

export async function updatePostSchedule(id: number, updates: Partial<InsertPostSchedule>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(postSchedules).set(updates).where(eq(postSchedules.id, id));
}

export async function deletePostSchedule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 関連する投稿コンテンツも削除
  await db.delete(postContents).where(eq(postContents.postScheduleId, id));
  await db.delete(postSchedules).where(eq(postSchedules.id, id));
}

export async function getUpcomingPostSchedules(limit: number = 10): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const schedules = await db.select().from(postSchedules)
    .where(and(
      eq(postSchedules.status, "scheduled"),
      gte(postSchedules.scheduledAt, now)
    ))
    .orderBy(asc(postSchedules.scheduledAt))
    .limit(limit);
  
  // 各スケジュールに対して投稿内容を取得
  const schedulesWithContents = await Promise.all(
    schedules.map(async (schedule) => {
      const contents = await db.select().from(postContents)
        .where(eq(postContents.postScheduleId, schedule.id));
      return {
        ...schedule,
        contents,
      };
    })
  );
  
  return schedulesWithContents;
}

export async function getPendingReminderSchedules(): Promise<PostSchedule[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30分後

  return await db.select().from(postSchedules)
    .where(and(
      eq(postSchedules.status, "scheduled"),
      eq(postSchedules.notificationSent, false),
      lte(postSchedules.scheduledAt, reminderTime),
      gte(postSchedules.scheduledAt, now)
    ))
    .orderBy(asc(postSchedules.scheduledAt));
}

export async function markReminderSent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(postSchedules).set({
    notificationSent: true,
    reminderSentAt: new Date(),
  }).where(eq(postSchedules.id, id));
}

// Post Contents
export async function createPostContent(content: InsertPostContent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(postContents).values(content);
  const insertedId = Number(result[0].insertId);
  
  return insertedId;
}

export async function getPostContentsByScheduleId(scheduleId: number): Promise<PostContent[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(postContents).where(eq(postContents.postScheduleId, scheduleId));
}

// Post History
export async function createPostHistory(history: InsertPostHistory): Promise<PostHistoryRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(postHistory).values(history);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(postHistory).where(eq(postHistory.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getPostHistoryByUserId(userId: number, limit = 50): Promise<PostHistoryRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(postHistory)
    .innerJoin(postSchedules, eq(postHistory.postScheduleId, postSchedules.id))
    .where(eq(postSchedules.userId, userId))
    .orderBy(desc(postHistory.publishedAt))
    .limit(limit)
    .then(results => results.map(r => r.post_history));
}

export async function getPostHistoryByScheduleId(scheduleId: number): Promise<PostHistoryRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(postHistory)
    .where(eq(postHistory.postScheduleId, scheduleId))
    .orderBy(desc(postHistory.createdAt));
}

export async function markPostAsPublished(scheduleId: number, platform: "instagram" | "x" | "threads", postId?: string, postUrl?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 投稿履歴を記録
  await db.insert(postHistory).values({
    postScheduleId: scheduleId,
    platform,
    postId,
    postUrl,
    status: "published",
    publishedAt: new Date(),
  });

  // スケジュールのステータスを更新
  await db.update(postSchedules).set({
    status: "completed",
    lastExecutedAt: new Date(),
  }).where(eq(postSchedules.id, scheduleId));
}

export async function getPostHistoryStats(userId: number): Promise<{
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  postsByPlatform: { platform: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      postsByPlatform: [],
    };
  }

  const history = await getPostHistoryByUserId(userId, 1000);

  const totalPosts = history.length;
  const successfulPosts = history.filter(h => h.status === "published").length;
  const failedPosts = history.filter(h => h.status === "failed").length;

  const platformCounts = history.reduce((acc, h) => {
    acc[h.platform] = (acc[h.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const postsByPlatform = Object.entries(platformCounts).map(([platform, count]) => ({
    platform,
    count,
  }));

  return {
    totalPosts,
    successfulPosts,
    failedPosts,
    postsByPlatform,
  };
}

// Analytics
export async function createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(analytics).values(analyticsData);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(analytics).where(eq(analytics.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getAnalyticsByPostHistoryId(postHistoryId: number): Promise<Analytics[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(analytics)
    .where(eq(analytics.postHistoryId, postHistoryId))
    .orderBy(desc(analytics.fetchedAt));
}

// Comments
export async function createComment(comment: InsertComment): Promise<Comment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(comments).values(comment);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(comments).where(eq(comments.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getPendingComments(limit = 20): Promise<Comment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(comments)
    .where(eq(comments.replyStatus, "pending"))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

export async function updateCommentReply(id: number, replyContent: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(comments).set({
    replyContent,
    replyStatus: "replied",
    repliedAt: new Date(),
  }).where(eq(comments.id, id));
}


// Custom Templates
export async function getCustomTemplatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { customTemplates } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  return await db.select().from(customTemplates).where(eq(customTemplates.userId, userId));
}

export async function getCustomTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { customTemplates } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const result = await db.select().from(customTemplates).where(eq(customTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCustomTemplate(data: {
  userId: number;
  baseTemplateId?: string | null;
  name: string;
  description?: string | null;
  structure: string;
  hashtags: string;
  targetAudience?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customTemplates } = await import("../drizzle/schema");
  
  const result = await db.insert(customTemplates).values(data);
  return result;
}

export async function updateCustomTemplate(id: number, data: {
  name?: string;
  description?: string | null;
  structure?: string;
  hashtags?: string;
  targetAudience?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customTemplates } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db.update(customTemplates).set(data).where(eq(customTemplates.id, id));
}

export async function deleteCustomTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { customTemplates } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  await db.delete(customTemplates).where(eq(customTemplates.id, id));
}

// Draft Posts (Approval Workflow)
export async function createDraftPost(draftData: InsertDraftPost): Promise<DraftPost> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(draftPosts).values(draftData);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(draftPosts).where(eq(draftPosts.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getPendingDraftPosts(): Promise<DraftPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(draftPosts)
    .where(eq(draftPosts.status, "pending"))
    .orderBy(desc(draftPosts.createdAt));
}

export async function getDraftPostsByUserId(userId: number): Promise<DraftPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(draftPosts)
    .where(eq(draftPosts.userId, userId))
    .orderBy(desc(draftPosts.createdAt));
}

export async function getDraftPostById(id: number): Promise<DraftPost | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(draftPosts).where(eq(draftPosts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDraftPostStatus(
  id: number,
  status: "pending" | "approved" | "rejected"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(draftPosts).set({ status }).where(eq(draftPosts.id, id));
}

export async function deleteDraftPost(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(draftPosts).where(eq(draftPosts.id, id));
}

// Approval History
export async function createApprovalHistory(historyData: InsertApprovalHistory): Promise<ApprovalHistory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(approvalHistory).values(historyData);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(approvalHistory).where(eq(approvalHistory.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getApprovalHistoryByDraftPostId(draftPostId: number): Promise<ApprovalHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(approvalHistory)
    .where(eq(approvalHistory.draftPostId, draftPostId))
    .orderBy(desc(approvalHistory.createdAt));
}

// User Activity Log
export async function createActivityLog(logData: InsertUserActivityLog): Promise<UserActivityLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userActivityLog).values(logData);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(userActivityLog).where(eq(userActivityLog.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserActivityLogs(userId: number, limit: number = 50): Promise<UserActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(userActivityLog)
    .where(eq(userActivityLog.userId, userId))
    .orderBy(desc(userActivityLog.createdAt))
    .limit(limit);
}

export async function getAllUsersActivityLogs(limit: number = 100): Promise<UserActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(userActivityLog)
    .orderBy(desc(userActivityLog.createdAt))
    .limit(limit);
}

export async function getUserActivityStats(userId: number): Promise<{
  totalActivities: number;
  successCount: number;
  failedCount: number;
  activityBreakdown: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return { totalActivities: 0, successCount: 0, failedCount: 0, activityBreakdown: {} };

  const logs = await getUserActivityLogs(userId, 1000);
  
  const stats = {
    totalActivities: logs.length,
    successCount: logs.filter(log => log.status === "success").length,
    failedCount: logs.filter(log => log.status === "failed").length,
    activityBreakdown: logs.reduce((acc, log) => {
      acc[log.activityType] = (acc[log.activityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return stats;
}

export async function getUserActivityLogsByDateRange(
  userId: number | null,
  startDate: Date,
  endDate: Date
): Promise<UserActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    return await db.select().from(userActivityLog)
      .where(
        and(
          eq(userActivityLog.userId, userId),
          gte(userActivityLog.createdAt, startDate),
          lte(userActivityLog.createdAt, endDate)
        )
      )
      .orderBy(desc(userActivityLog.createdAt));
  } else {
    return await db.select().from(userActivityLog)
      .where(
        and(
          gte(userActivityLog.createdAt, startDate),
          lte(userActivityLog.createdAt, endDate)
        )
      )
      .orderBy(desc(userActivityLog.createdAt));
  }
}

export async function getActivityTrendsByDateRange(
  userId: number | null,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month'
): Promise<Array<{
  date: string;
  totalActivities: number;
  successCount: number;
  failedCount: number;
  activityBreakdown: Record<string, number>;
}>> {
  const logs = await getUserActivityLogsByDateRange(userId, startDate, endDate);
  
  // 日付ごとにグループ化
  const groupedByDate = logs.reduce((acc, log) => {
    let dateKey: string;
    const logDate = new Date(log.createdAt);
    
    if (groupBy === 'day') {
      dateKey = logDate.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      // 週の始まり（月曜日）を取得
      const weekStart = new Date(logDate);
      weekStart.setDate(logDate.getDate() - logDate.getDay() + 1);
      dateKey = weekStart.toISOString().split('T')[0];
    } else {
      dateKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, UserActivityLog[]>);
  
  // 各日付の統計を計算
  const trends = Object.entries(groupedByDate).map(([date, logs]) => ({
    date,
    totalActivities: logs.length,
    successCount: logs.filter(log => log.status === 'success').length,
    failedCount: logs.filter(log => log.status === 'failed').length,
    activityBreakdown: logs.reduce((acc, log) => {
      acc[log.activityType] = (acc[log.activityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }));
  
  // 日付でソート
  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

// User Feedback
export async function createUserFeedback(feedbackData: InsertUserFeedback): Promise<UserFeedback> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userFeedback).values(feedbackData);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(userFeedback).where(eq(userFeedback.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getUserFeedback(userId: number, limit: number = 50): Promise<UserFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(userFeedback)
    .where(eq(userFeedback.userId, userId))
    .orderBy(desc(userFeedback.createdAt))
    .limit(limit);
}

export async function getUnreadFeedbackCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select().from(userFeedback)
    .where(and(eq(userFeedback.userId, userId), eq(userFeedback.isRead, false)));
  
  return result.length;
}

export async function markFeedbackAsRead(feedbackId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userFeedback).set({ isRead: true }).where(eq(userFeedback.id, feedbackId));
}

export async function getAllUsersFeedback(limit: number = 100): Promise<UserFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(userFeedback)
    .orderBy(desc(userFeedback.createdAt))
    .limit(limit);
}

// ==================== Upload History ====================

export async function createUploadHistory(data: InsertUploadHistory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(uploadHistory).values(data);
  return result[0].insertId;
}

export async function getUploadHistoryByUserId(userId: number): Promise<UploadHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(uploadHistory)
    .where(eq(uploadHistory.userId, userId))
    .orderBy(desc(uploadHistory.createdAt));
}

export async function getUploadHistoryById(id: number): Promise<UploadHistory | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(uploadHistory)
    .where(eq(uploadHistory.id, id))
    .limit(1);

  return result[0];
}

export async function deleteUploadHistory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(uploadHistory).where(eq(uploadHistory.id, id));
}

// ==================== Analytics ====================

/**
 * Create or update analytics record for a post
 */
export async function upsertAnalytics(data: InsertAnalytics): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate engagement rate (basis points: 1% = 100)
  const likes = data.likes || 0;
  const comments = data.comments || 0;
  const shares = data.shares || 0;
  const views = data.views || 0;
  const engagementRate = views > 0 
    ? Math.round(((likes + comments + shares) / views) * 10000)
    : 0;

  const values = {
    ...data,
    engagementRate,
  };

  const result = await db.insert(analytics).values(values);
  return result[0].insertId;
}

/**
 * Get analytics summary for a user's posts
 */
export async function getAnalyticsSummary(userId: number): Promise<{
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgEngagementRate: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      avgEngagementRate: 0,
    };
  }

  // Get all post history records for the user
  const userPosts = await db
    .select()
    .from(postHistory)
    .innerJoin(postSchedules, eq(postHistory.postScheduleId, postSchedules.id))
    .where(eq(postSchedules.userId, userId));

  if (userPosts.length === 0) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      avgEngagementRate: 0,
    };
  }

  // Get analytics for all posts
  const postHistoryIds = userPosts.map(p => p.post_history.id);
  const analyticsRecords = await db
    .select()
    .from(analytics)
    .where(sql`${analytics.postHistoryId} IN (${sql.join(postHistoryIds.map(id => sql`${id}`), sql`, `)})`);

  const summary = analyticsRecords.reduce(
    (acc, record) => ({
      totalPosts: acc.totalPosts + 1,
      totalLikes: acc.totalLikes + record.likes,
      totalComments: acc.totalComments + record.comments,
      totalShares: acc.totalShares + record.shares,
      totalViews: acc.totalViews + record.views,
      avgEngagementRate: acc.avgEngagementRate + record.engagementRate,
    }),
    {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      avgEngagementRate: 0,
    }
  );

  if (summary.totalPosts > 0) {
    summary.avgEngagementRate = Math.round(summary.avgEngagementRate / summary.totalPosts);
  }

  return summary;
}

/**
 * Get analytics grouped by platform
 */
export async function getAnalyticsByPlatform(userId: number): Promise<{
  platform: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgEngagementRate: number;
}[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all post history records for the user
  const userPosts = await db
    .select()
    .from(postHistory)
    .innerJoin(postSchedules, eq(postHistory.postScheduleId, postSchedules.id))
    .where(eq(postSchedules.userId, userId));

  if (userPosts.length === 0) return [];

  // Get analytics for all posts
  const postHistoryIds = userPosts.map(p => p.post_history.id);
  const analyticsRecords = await db
    .select()
    .from(analytics)
    .where(sql`${analytics.postHistoryId} IN (${sql.join(postHistoryIds.map(id => sql`${id}`), sql`, `)})`);

  // Group by platform
  const platformMap = new Map<string, {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    avgEngagementRate: number;
  }>();

  for (const post of userPosts) {
    const platform = post.post_history.platform;
    const analyticsRecord = analyticsRecords.find(a => a.postHistoryId === post.post_history.id);

    if (!analyticsRecord) continue;

    const existing = platformMap.get(platform) || {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0,
      avgEngagementRate: 0,
    };

    platformMap.set(platform, {
      totalPosts: existing.totalPosts + 1,
      totalLikes: existing.totalLikes + analyticsRecord.likes,
      totalComments: existing.totalComments + analyticsRecord.comments,
      totalShares: existing.totalShares + analyticsRecord.shares,
      totalViews: existing.totalViews + analyticsRecord.views,
      avgEngagementRate: existing.avgEngagementRate + analyticsRecord.engagementRate,
    });
  }

  // Calculate averages and convert to array
  return Array.from(platformMap.entries()).map(([platform, stats]) => ({
    platform,
    ...stats,
    avgEngagementRate: stats.totalPosts > 0 ? Math.round(stats.avgEngagementRate / stats.totalPosts) : 0,
  }));
}

/**
 * Get analytics grouped by hour of day
 */
export async function getAnalyticsByHourOfDay(userId: number): Promise<{
  hourOfDay: number;
  totalPosts: number;
  avgEngagementRate: number;
}[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all post history records for the user
  const userPosts = await db
    .select()
    .from(postHistory)
    .innerJoin(postSchedules, eq(postHistory.postScheduleId, postSchedules.id))
    .where(eq(postSchedules.userId, userId));

  if (userPosts.length === 0) return [];

  // Get analytics for all posts
  const postHistoryIds = userPosts.map(p => p.post_history.id);
  const analyticsRecords = await db
    .select()
    .from(analytics)
    .where(sql`${analytics.postHistoryId} IN (${sql.join(postHistoryIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(analytics.hourOfDay);

  // Group by hour of day
  const hourMap = new Map<number, { totalPosts: number; avgEngagementRate: number }>();

  for (const record of analyticsRecords) {
    if (record.hourOfDay === null) continue;

    const existing = hourMap.get(record.hourOfDay) || { totalPosts: 0, avgEngagementRate: 0 };
    hourMap.set(record.hourOfDay, {
      totalPosts: existing.totalPosts + 1,
      avgEngagementRate: existing.avgEngagementRate + record.engagementRate,
    });
  }

  // Calculate averages and convert to array
  return Array.from(hourMap.entries()).map(([hourOfDay, stats]) => ({
    hourOfDay,
    totalPosts: stats.totalPosts,
    avgEngagementRate: stats.totalPosts > 0 ? Math.round(stats.avgEngagementRate / stats.totalPosts) : 0,
  }));
}

/**
 * Get analytics grouped by day of week
 */
export async function getAnalyticsByDayOfWeek(userId: number): Promise<{
  dayOfWeek: number;
  totalPosts: number;
  avgEngagementRate: number;
}[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all post history records for the user
  const userPosts = await db
    .select()
    .from(postHistory)
    .innerJoin(postSchedules, eq(postHistory.postScheduleId, postSchedules.id))
    .where(eq(postSchedules.userId, userId));

  if (userPosts.length === 0) return [];

  // Get analytics for all posts
  const postHistoryIds = userPosts.map(p => p.post_history.id);
  const analyticsRecords = await db
    .select()
    .from(analytics)
    .where(sql`${analytics.postHistoryId} IN (${sql.join(postHistoryIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(analytics.dayOfWeek);

  // Group by day of week
  const dayMap = new Map<number, { totalPosts: number; avgEngagementRate: number }>();

  for (const record of analyticsRecords) {
    if (record.dayOfWeek === null) continue;

    const existing = dayMap.get(record.dayOfWeek) || { totalPosts: 0, avgEngagementRate: 0 };
    dayMap.set(record.dayOfWeek, {
      totalPosts: existing.totalPosts + 1,
      avgEngagementRate: existing.avgEngagementRate + record.engagementRate,
    });
  }

  // Calculate averages and convert to array
  return Array.from(dayMap.entries()).map(([dayOfWeek, stats]) => ({
    dayOfWeek,
    totalPosts: stats.totalPosts,
    avgEngagementRate: stats.totalPosts > 0 ? Math.round(stats.avgEngagementRate / stats.totalPosts) : 0,
  }));
}

// ==================== Photo Tagging ====================

/**
 * Extract tags from AI analysis
 */
export function extractTagsFromAnalysis(analysisResult: string): string[] {
  const tags = new Set<string>();

  // Also check plain text for keywords
  const textLower = analysisResult.toLowerCase();
  
  // Category tags
  if (textLower.includes('exterior') || textLower.includes('外観')) {
    tags.add('外観');
  }
  if (textLower.includes('interior') || textLower.includes('内装')) {
    tags.add('内装');
  }
  if (textLower.includes('before') || textLower.includes('after') || 
      textLower.includes('ビフォーアフター') || textLower.includes('施工前') || textLower.includes('施工後')) {
    tags.add('ビフォーアフター');
  }
  if (textLower.includes('renovation') || textLower.includes('リフォーム')) {
    tags.add('リフォーム');
  }
  if (textLower.includes('new construction') || textLower.includes('新築')) {
    tags.add('新築');
  }
  if (textLower.includes('完成')) {
    tags.add('完成');
  }

  try {
    // Try to parse as JSON first
    const analysis = JSON.parse(analysisResult);

    // Extract category-based tags
    if (analysis.category) {
      const category = analysis.category.toLowerCase();
      if (category.includes('exterior') || category.includes('外観')) {
        tags.add('外観');
      }
      if (category.includes('interior') || category.includes('内装')) {
        tags.add('内装');
      }
      if (category.includes('bathroom') || category.includes('浴室')) {
        tags.add('浴室');
      }
      if (category.includes('kitchen') || category.includes('キッチン')) {
        tags.add('キッチン');
      }
      if (category.includes('living') || category.includes('リビング')) {
        tags.add('リビング');
      }
      if (category.includes('bedroom') || category.includes('寝室')) {
        tags.add('寝室');
      }
    }

    // Extract style-based tags
    if (analysis.style) {
      const style = analysis.style.toLowerCase();
      if (style.includes('modern') || style.includes('モダン')) {
        tags.add('モダン');
      }
      if (style.includes('traditional') || style.includes('和風')) {
        tags.add('和風');
      }
      if (style.includes('minimalist') || style.includes('シンプル')) {
        tags.add('シンプル');
      }
      if (style.includes('luxury') || style.includes('高級')) {
        tags.add('高級');
      }
    }

    // Extract feature-based tags
    if (analysis.features) {
      const features = Array.isArray(analysis.features) 
        ? analysis.features.join(' ').toLowerCase()
        : analysis.features.toLowerCase();
      
      if (features.includes('wood') || features.includes('木材')) {
        tags.add('木材');
      }
      if (features.includes('stone') || features.includes('石材')) {
        tags.add('石材');
      }
      if (features.includes('glass') || features.includes('ガラス')) {
        tags.add('ガラス');
      }
      if (features.includes('natural light') || features.includes('自然光')) {
        tags.add('自然光');
      }
      if (features.includes('open space') || features.includes('開放的')) {
        tags.add('開放的');
      }
    }

    // Extract condition-based tags
    if (analysis.description) {
      const description = analysis.description.toLowerCase();
      if (description.includes('before') || description.includes('施工前')) {
        tags.add('施工前');
      }
      if (description.includes('after') || description.includes('施工後')) {
        tags.add('施工後');
      }
      if (description.includes('renovation') || description.includes('リフォーム')) {
        tags.add('リフォーム');
      }
      if (description.includes('new construction') || description.includes('新築')) {
        tags.add('新築');
      }
    }

  } catch (error) {
    console.error('Failed to parse analysis result for tag extraction:', error);
  }

  return Array.from(tags);
}

/**
 * Update tags for upload history
 */
export async function updateUploadHistoryTags(id: number, tags: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(uploadHistory)
    .set({ tags: JSON.stringify(tags) })
    .where(eq(uploadHistory.id, id));
}

/**
 * Search upload history by tags
 */
export async function searchUploadHistoryByTags(userId: number, tags: string[]): Promise<UploadHistory[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all upload history for the user
  const allHistory = await db
    .select()
    .from(uploadHistory)
    .where(eq(uploadHistory.userId, userId))
    .orderBy(desc(uploadHistory.createdAt));

  // Filter by tags
  return allHistory.filter(history => {
    if (!history.tags) return false;
    
    try {
      const historyTags: string[] = JSON.parse(history.tags);
      return tags.some(tag => historyTags.includes(tag));
    } catch {
      return false;
    }
  });
}

// ==================== Optimal Posting Time Suggestions ====================

/**
 * Get optimal posting times based on historical engagement data
 */
export async function getOptimalPostingTimes(userId: number): Promise<{
  bestHours: { hour: number; score: number; avgEngagementRate: number; totalPosts: number }[];
  bestDays: { day: number; score: number; avgEngagementRate: number; totalPosts: number }[];
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      bestHours: [],
      bestDays: [],
      recommendations: [],
    };
  }

  // Get analytics by hour and day
  const hourData = await getAnalyticsByHourOfDay(userId);
  const dayData = await getAnalyticsByDayOfWeek(userId);

  // Calculate scores for each hour (engagement rate * post count)
  const hourScores = hourData.map(h => ({
    hour: h.hourOfDay,
    score: h.avgEngagementRate * Math.log(h.totalPosts + 1), // Log scale for post count
    avgEngagementRate: h.avgEngagementRate,
    totalPosts: h.totalPosts,
  })).sort((a, b) => b.score - a.score);

  // Calculate scores for each day
  const dayScores = dayData.map(d => ({
    day: d.dayOfWeek,
    score: d.avgEngagementRate * Math.log(d.totalPosts + 1),
    avgEngagementRate: d.avgEngagementRate,
    totalPosts: d.totalPosts,
  })).sort((a, b) => b.score - a.score);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (hourScores.length > 0) {
    const topHour = hourScores[0];
    recommendations.push(
      `最もエンゲージメント率が高い時間帯は${topHour.hour}時です（エンゲージメント率: ${(topHour.avgEngagementRate / 100).toFixed(2)}%）`
    );
  }

  if (dayScores.length > 0) {
    const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const topDay = dayScores[0];
    recommendations.push(
      `最もエンゲージメント率が高い曜日は${dayNames[topDay.day]}です（エンゲージメント率: ${(topDay.avgEngagementRate / 100).toFixed(2)}%）`
    );
  }

  // Add time-based recommendations
  if (hourScores.length >= 3) {
    const morningHours = hourScores.filter(h => h.hour >= 6 && h.hour < 12);
    const afternoonHours = hourScores.filter(h => h.hour >= 12 && h.hour < 18);
    const eveningHours = hourScores.filter(h => h.hour >= 18 && h.hour < 24);

    const bestPeriod = [
      { name: "朝", hours: morningHours },
      { name: "昼", hours: afternoonHours },
      { name: "夜", hours: eveningHours },
    ].sort((a, b) => {
      const avgA = a.hours.reduce((sum, h) => sum + h.avgEngagementRate, 0) / (a.hours.length || 1);
      const avgB = b.hours.reduce((sum, h) => sum + h.avgEngagementRate, 0) / (b.hours.length || 1);
      return avgB - avgA;
    })[0];

    if (bestPeriod.hours.length > 0) {
      recommendations.push(`${bestPeriod.name}の時間帯が最も効果的です`);
    }
  }

  // Add weekday vs weekend recommendation
  if (dayScores.length >= 3) {
    const weekdayData = dayScores.filter(d => d.day >= 1 && d.day <= 5);
    const weekendData = dayScores.filter(d => d.day === 0 || d.day === 6);

    if (weekdayData.length > 0 && weekendData.length > 0) {
      const weekdayAvg = weekdayData.reduce((sum, d) => sum + d.avgEngagementRate, 0) / weekdayData.length;
      const weekendAvg = weekendData.reduce((sum, d) => sum + d.avgEngagementRate, 0) / weekendData.length;

      if (weekendAvg > weekdayAvg * 1.1) {
        recommendations.push("週末の投稿が平日よりも効果的です");
      } else if (weekdayAvg > weekendAvg * 1.1) {
        recommendations.push("平日の投稿が週末よりも効果的です");
      }
    }
  }

  return {
    bestHours: hourScores.slice(0, 5),
    bestDays: dayScores.slice(0, 3),
    recommendations,
  };
}

/**
 * Suggest optimal posting time for a new post
 */
export async function suggestPostingTime(userId: number): Promise<{
  suggestedHour: number;
  suggestedDay: number;
  confidence: number;
  reason: string;
}> {
  const optimal = await getOptimalPostingTimes(userId);

  if (optimal.bestHours.length === 0 || optimal.bestDays.length === 0) {
    // Default suggestion if no data available
    return {
      suggestedHour: 12, // Noon
      suggestedDay: 3, // Wednesday
      confidence: 0,
      reason: "過去のデータが不足しているため、デフォルトの時間帯（水曜日12時）を提案します",
    };
  }

  const bestHour = optimal.bestHours[0];
  const bestDay = optimal.bestDays[0];

  // Calculate confidence based on data availability
  const confidence = Math.min(
    100,
    Math.round((bestHour.totalPosts + bestDay.totalPosts) / 2 * 10)
  );

  const dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  const reason = `過去のデータから、${dayNames[bestDay.day]}の${bestHour.hour}時が最も高いエンゲージメント率（${(bestHour.avgEngagementRate / 100).toFixed(2)}%）を記録しています`;

  return {
    suggestedHour: bestHour.hour,
    suggestedDay: bestDay.day,
    confidence,
    reason,
  };
}


// ===== Favorite Images Functions =====

export async function createFavoriteImage(data: {
  userId: number;
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
  imageUrl: string;
  score?: number;
  analysis?: string;
  tags?: string;
  title?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(favoriteImages).values({
    userId: data.userId,
    companyName: data.companyName,
    imageUrl: data.imageUrl,
    score: data.score,
    analysis: data.analysis,
    tags: data.tags,
    title: data.title,
    notes: data.notes,
  });

  return result;
}

export async function getFavoriteImages(userId: number, companyName?: "ハゼモト建設" | "クリニックアーキプロ") {
  const db = await getDb();
  if (!db) return [];

  if (companyName) {
    const results = await db.select().from(favoriteImages)
      .where(and(
        eq(favoriteImages.userId, userId),
        eq(favoriteImages.companyName, companyName)
      ))
      .orderBy(desc(favoriteImages.createdAt));
    return results;
  } else {
    const results = await db.select().from(favoriteImages)
      .where(eq(favoriteImages.userId, userId))
      .orderBy(desc(favoriteImages.createdAt));
    return results;
  }
}

export async function deleteFavoriteImage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(favoriteImages).where(
    and(
      eq(favoriteImages.id, id),
      eq(favoriteImages.userId, userId)
    )
  );
}

export async function updateFavoriteImage(
  id: number,
  userId: number,
  data: {
    title?: string;
    notes?: string;
    tags?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(favoriteImages)
    .set(data)
    .where(
      and(
        eq(favoriteImages.id, id),
        eq(favoriteImages.userId, userId)
      )
    );
}


// ==================== エラーログ管理 ====================

export async function createErrorLog(errorLog: InsertErrorLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create error log: database not available");
    return null;
  }

  try {
    const result = await db.insert(errorLogs).values(errorLog);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create error log:", error);
    return null;
  }
}

export async function getErrorLogsByUser(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get error logs: database not available");
    return [];
  }

  try {
    const logs = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.userId, userId))
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);
    return logs;
  } catch (error) {
    console.error("[Database] Failed to get error logs:", error);
    return [];
  }
}

export async function getErrorStatsByUser(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get error stats: database not available");
    return { totalErrors: 0, errorsByType: {} };
  }

  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const logs = await db
      .select()
      .from(errorLogs)
      .where(
        sql`${errorLogs.userId} = ${userId} AND ${errorLogs.createdAt} >= ${dateThreshold}`
      );

    const errorsByType: Record<string, number> = {};
    logs.forEach((log) => {
      errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1;
    });

    return {
      totalErrors: logs.length,
      errorsByType,
    };
  } catch (error) {
    console.error("[Database] Failed to get error stats:", error);
    return { totalErrors: 0, errorsByType: {} };
  }
}

/**
 * 写真取得の成功率を計算
 * 
 * @param userId ユーザーID
 * @param days 集計期間（日数）
 * @returns 成功率と詳細統計
 */
export async function getPhotoFetchSuccessRate(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get photo fetch success rate: database not available");
    return {
      successRate: 0,
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      errorsByType: {},
      recentErrors: [],
    };
  }

  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // 期間内のエラーログを取得（写真取得関連のみ）
    const errorLogsData = await db
      .select()
      .from(errorLogs)
      .where(
        sql`${errorLogs.userId} = ${userId} AND ${errorLogs.createdAt} >= ${dateThreshold}`
      );

    // エラー種別ごとの集計
    const errorsByType: Record<string, number> = {};
    errorLogsData.forEach((log) => {
      errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1;
    });

    // 期間内の作業ログを取得（写真関連のみ）
    const activityLogsData = await db
      .select()
      .from(userActivityLog)
      .where(
        sql`${userActivityLog.userId} = ${userId} 
        AND ${userActivityLog.createdAt} >= ${dateThreshold}
        AND ${userActivityLog.activityType} IN ('photo_upload', 'photo_analysis', 'post_generation')`
      );

    // 成功・失敗のカウント
    const successCount = activityLogsData.filter(log => log.status === 'success').length;
    const failureCount = activityLogsData.filter(log => log.status === 'failed').length;
    const totalAttempts = successCount + failureCount;

    // 成功率を計算（0〜100）
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    // 最近のエラー（最大10件）
    const recentErrors = errorLogsData
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map(log => ({
        errorType: log.errorType,
        reason: log.errorReason,
        details: log.errorDetails,
        createdAt: log.createdAt,
      }));

    return {
      successRate: Math.round(successRate * 100) / 100, // 小数点2桁
      totalAttempts,
      successCount,
      failureCount,
      errorsByType,
      recentErrors,
    };
  } catch (error) {
    console.error("[Database] Failed to get photo fetch success rate:", error);
    return {
      successRate: 0,
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      errorsByType: {},
      recentErrors: [],
    };
  }
}

/**
 * 写真取得の成功率履歴を記録
 * 
 * @param userId ユーザーID
 * @param successRate 成功率（0〜100）
 * @param totalAttempts 総試行回数
 * @param successCount 成功回数
 * @param failureCount 失敗回数
 */
export async function recordPhotoFetchSuccessRate(
  userId: number,
  successRate: number,
  totalAttempts: number,
  successCount: number,
  failureCount: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record photo fetch success rate: database not available");
    return null;
  }

  try {
    // 作業ログに記録（統計情報として）
    await db.insert(userActivityLog).values({
      userId,
      activityType: 'photo_fetch',
      status: 'success',
      details: JSON.stringify({
        type: 'success_rate_snapshot',
        successRate,
        totalAttempts,
        successCount,
        failureCount,
        timestamp: new Date().toISOString(),
      }),
    });
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to record photo fetch success rate:", error);
    return null;
  }
}


// ========================================
// Post Templates
// ========================================

export async function getPostTemplatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { postTemplates } = await import("../drizzle/schema");
  const result = await db.select().from(postTemplates).where(eq(postTemplates.userId, userId));
  return result;
}

export async function getPostTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { postTemplates } = await import("../drizzle/schema");
  const result = await db.select().from(postTemplates).where(eq(postTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPostTemplate(template: {
  userId: number;
  name: string;
  description?: string;
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
  isBeforeAfter?: boolean;
  instagramCaption?: string;
  instagramHashtags?: string;
  xCaption?: string;
  xHashtags?: string;
  threadsCaption?: string;
  threadsHashtags?: string;
  defaultPostTime?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { postTemplates } = await import("../drizzle/schema");
  const result: any = await db.insert(postTemplates).values(template);
  return Number(result[0].insertId);
}

export async function updatePostTemplate(id: number, updates: {
  name?: string;
  description?: string;
  companyName?: "ハゼモト建設" | "クリニックアーキプロ";
  isBeforeAfter?: boolean;
  instagramCaption?: string;
  instagramHashtags?: string;
  xCaption?: string;
  xHashtags?: string;
  threadsCaption?: string;
  threadsHashtags?: string;
  defaultPostTime?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { postTemplates } = await import("../drizzle/schema");
  await db.update(postTemplates).set(updates).where(eq(postTemplates.id, id));
}

export async function deletePostTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { postTemplates } = await import("../drizzle/schema");
  await db.delete(postTemplates).where(eq(postTemplates.id, id));
}


// ========================================
// Post Drafts
// ========================================

export async function getPostDraftsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(postDrafts)
    .where(eq(postDrafts.userId, userId))
    .orderBy(desc(postDrafts.updatedAt));
  return result;
}

export async function getPostDraftById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(postDrafts)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPostDraft(draft: {
  userId: number;
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
  title?: string;
  isBeforeAfter?: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  imageUrl?: string;
  instagramContent?: string;
  instagramHashtags?: string;
  xContent?: string;
  xHashtags?: string;
  threadsContent?: string;
  threadsHashtags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result: any = await db.insert(postDrafts).values(draft);
  return Number(result.insertId);
}

export async function updatePostDraft(id: number, userId: number, updates: {
  title?: string;
  companyName?: "ハゼモト建設" | "クリニックアーキプロ";
  isBeforeAfter?: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  imageUrl?: string;
  instagramContent?: string;
  instagramHashtags?: string;
  xContent?: string;
  xHashtags?: string;
  threadsContent?: string;
  threadsHashtags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(postDrafts)
    .set(updates)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, userId)));
}

export async function deletePostDraft(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(postDrafts)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, userId)));
}

// ========================================
// Data Sources Management
// ========================================

export async function createDataSource(dataSource: InsertDataSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dataSources).values(dataSource);
  return result;
}

export async function getDataSourcesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(dataSources).where(eq(dataSources.userId, userId));
  return result;
}

export async function getDataSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(dataSources).where(eq(dataSources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDataSource(id: number, updates: Partial<InsertDataSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dataSources).set(updates).where(eq(dataSources.id, id));
}

export async function deleteDataSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete associated template_data_sources first
  await db.delete(templateDataSources).where(eq(templateDataSources.dataSourceId, id));
  // Then delete the data source
  await db.delete(dataSources).where(eq(dataSources.id, id));
}

// ========================================
// Template Data Sources Management
// ========================================

export async function linkTemplateToDataSource(templateId: number, dataSourceId: number, priority: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(templateDataSources).values({
    templateId,
    dataSourceId,
    priority,
  });
  return result;
}

export async function getDataSourcesByTemplateId(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: dataSources.id,
      userId: dataSources.userId,
      name: dataSources.name,
      provider: dataSources.provider,
      accessToken: dataSources.accessToken,
      refreshToken: dataSources.refreshToken,
      albumId: dataSources.albumId,
      folderId: dataSources.folderId,
      folderPath: dataSources.folderPath,
      isActive: dataSources.isActive,
      lastSyncedAt: dataSources.lastSyncedAt,
      priority: templateDataSources.priority,
    })
    .from(templateDataSources)
    .innerJoin(dataSources, eq(templateDataSources.dataSourceId, dataSources.id))
    .where(eq(templateDataSources.templateId, templateId))
    .orderBy(templateDataSources.priority);
  
  return result;
}

export async function linkTemplateDataSources(templateId: number, dataSourceIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 既存の紐付けを削除
  await db
    .delete(templateDataSources)
    .where(eq(templateDataSources.templateId, templateId));
  
  // 新しい紐付けを追加（優先順位は配列の順序）
  if (dataSourceIds.length > 0) {
    const values = dataSourceIds.map((dataSourceId, index) => ({
      templateId,
      dataSourceId,
      priority: index,
    }));
    await db.insert(templateDataSources).values(values);
  }
}

export async function unlinkTemplateFromDataSource(templateId: number, dataSourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(templateDataSources)
    .where(
      and(
        eq(templateDataSources.templateId, templateId),
        eq(templateDataSources.dataSourceId, dataSourceId)
      )
    );
}

export async function updateTemplateDataSourcePriority(templateId: number, dataSourceId: number, priority: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(templateDataSources)
    .set({ priority })
    .where(
      and(
        eq(templateDataSources.templateId, templateId),
        eq(templateDataSources.dataSourceId, dataSourceId)
      )
    );
}

// Template Performance Stats Functions

export async function recordTemplatePerformance(params: {
  templateId: number;
  dataSourceId: number | null;
  success: boolean;
  platform?: "instagram" | "x" | "threads";
  companyName?: "ハゼモト建設" | "クリニックアーキプロ";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 今日の統計レコードを検索
  const existing = await db
    .select()
    .from(templatePerformanceStats)
    .where(
      and(
        eq(templatePerformanceStats.templateId, params.templateId),
        params.dataSourceId 
          ? eq(templatePerformanceStats.dataSourceId, params.dataSourceId)
          : isNull(templatePerformanceStats.dataSourceId),
        eq(templatePerformanceStats.generationDate, today),
        params.platform 
          ? eq(templatePerformanceStats.platform, params.platform)
          : isNull(templatePerformanceStats.platform),
        params.companyName
          ? eq(templatePerformanceStats.companyName, params.companyName)
          : isNull(templatePerformanceStats.companyName)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // 既存レコードを更新
    const stat = existing[0];
    await db
      .update(templatePerformanceStats)
      .set({
        totalAttempts: stat.totalAttempts + 1,
        successCount: params.success ? stat.successCount + 1 : stat.successCount,
        failureCount: params.success ? stat.failureCount : stat.failureCount + 1,
      })
      .where(eq(templatePerformanceStats.id, stat.id));
  } else {
    // 新規レコードを作成
    await db.insert(templatePerformanceStats).values({
      templateId: params.templateId,
      dataSourceId: params.dataSourceId,
      generationDate: today,
      totalAttempts: 1,
      successCount: params.success ? 1 : 0,
      failureCount: params.success ? 0 : 1,
      platform: params.platform || null,
      companyName: params.companyName || null,
    });
  }
}

export async function getTemplatePerformanceStats(params?: {
  templateId?: number;
  dataSourceId?: number;
  startDate?: Date;
  endDate?: Date;
  platform?: "instagram" | "x" | "threads";
  companyName?: "ハゼモト建設" | "クリニックアーキプロ";
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (params?.templateId) {
    conditions.push(eq(templatePerformanceStats.templateId, params.templateId));
  }
  if (params?.dataSourceId) {
    conditions.push(eq(templatePerformanceStats.dataSourceId, params.dataSourceId));
  }
  if (params?.startDate) {
    conditions.push(gte(templatePerformanceStats.generationDate, params.startDate));
  }
  if (params?.endDate) {
    conditions.push(lte(templatePerformanceStats.generationDate, params.endDate));
  }
  if (params?.platform) {
    conditions.push(eq(templatePerformanceStats.platform, params.platform));
  }
  if (params?.companyName) {
    conditions.push(eq(templatePerformanceStats.companyName, params.companyName));
  }
  
  const query = db
    .select()
    .from(templatePerformanceStats);
  
  if (conditions.length > 0) {
    return await query.where(and(...conditions)).orderBy(desc(templatePerformanceStats.generationDate));
  }
  
  return await query.orderBy(desc(templatePerformanceStats.generationDate));
}

export async function getTemplatePerformanceSummary(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  // テンプレート別の集計を取得
  const conditions = [];
  if (params?.startDate) {
    conditions.push(gte(templatePerformanceStats.generationDate, params.startDate));
  }
  if (params?.endDate) {
    conditions.push(lte(templatePerformanceStats.generationDate, params.endDate));
  }
  
  const query = db
    .select({
      templateId: templatePerformanceStats.templateId,
      dataSourceId: templatePerformanceStats.dataSourceId,
      platform: templatePerformanceStats.platform,
      companyName: templatePerformanceStats.companyName,
      totalAttempts: sql<number>`SUM(${templatePerformanceStats.totalAttempts})`,
      successCount: sql<number>`SUM(${templatePerformanceStats.successCount})`,
      failureCount: sql<number>`SUM(${templatePerformanceStats.failureCount})`,
    })
    .from(templatePerformanceStats);
  
  if (conditions.length > 0) {
    return await query
      .where(and(...conditions))
      .groupBy(
        templatePerformanceStats.templateId,
        templatePerformanceStats.dataSourceId,
        templatePerformanceStats.platform,
        templatePerformanceStats.companyName
      );
  }
  
  return await query.groupBy(
    templatePerformanceStats.templateId,
    templatePerformanceStats.dataSourceId,
    templatePerformanceStats.platform,
    templatePerformanceStats.companyName
  );
}
