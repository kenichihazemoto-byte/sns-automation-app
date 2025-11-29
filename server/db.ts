import { eq, and, desc, gte, lte, asc } from "drizzle-orm";
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

export async function getPostSchedulesByUserId(userId: number): Promise<PostSchedule[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(postSchedules)
    .where(eq(postSchedules.userId, userId))
    .orderBy(desc(postSchedules.scheduledAt));
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

export async function getUpcomingPostSchedules(limit: number = 10): Promise<PostSchedule[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return await db.select().from(postSchedules)
    .where(and(
      eq(postSchedules.status, "scheduled"),
      gte(postSchedules.scheduledAt, now)
    ))
    .orderBy(asc(postSchedules.scheduledAt))
    .limit(limit);
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
    .where(eq(userFeedback.userId, userId))
    .where(eq(userFeedback.isRead, false));
  
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
