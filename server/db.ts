import { eq, and, desc } from "drizzle-orm";
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

export async function updatePostScheduleStatus(id: number, status: "draft" | "scheduled" | "active" | "pending" | "processing" | "completed" | "failed" | "cancelled"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(postSchedules).set({ status }).where(eq(postSchedules.id, id));
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
    .orderBy(desc(postHistory.createdAt))
    .limit(limit)
    .then(results => results.map(r => r.post_history));
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
