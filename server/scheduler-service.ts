/**
 * 投稿スケジューラーサービス
 * cron jobを使用して定期的に投稿を実行
 */

import * as cron from 'node-cron';
import * as googlePhotosService from './google-photos-service';
import * as aiService from './ai-service';
import * as snsApiService from './sns-api-service';
import { getDb } from './db';
import { snsAccounts, images, postSchedules, postContents, postHistory } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * スケジュールされた投稿を実行
 */
export async function executeScheduledPost(scheduleId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // スケジュール情報を取得
    const schedules = await db
      .select()
      .from(postSchedules)
      .where(eq(postSchedules.id, scheduleId))
      .limit(1);

    if (schedules.length === 0) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const schedule = schedules[0];

    // ランダムな写真を取得
    const { photo, album } = await googlePhotosService.getRandomConstructionPhoto();

    // AI画像分析
    const analysis = await aiService.analyzeImage(photo.url);

    // 画像をデータベースに保存
    const [insertedImage] = await db.insert(images).values({
      url: photo.url,
      sourceAlbum: album.title,
      category: analysis.category,
      style: analysis.style,
      description: analysis.description,
      keywords: analysis.keywords.join(','),
      aiAnalysisResult: JSON.stringify(analysis),
    });

    const imageId = insertedImage.insertId;

    // 各プラットフォームの投稿コンテンツを生成
    const platforms = ['instagram', 'x', 'threads'] as const;
    const contents: { [key: string]: any } = {};
    const postContentIds: { [key: string]: number } = {};

    for (const platform of platforms) {
      const content = await aiService.generatePostContent({
        platform,
        imageAnalysis: analysis,
        companyName: schedule.companyName as "ハゼモト建設" | "クリニックアーキプロ",
      });

      // 投稿コンテンツをデータベースに保存
      const [insertedContent] = await db.insert(postContents).values({
        postScheduleId: schedule.id,
        platform,
        caption: content.caption,
        hashtags: content.hashtags.join(','),
      });

      contents[platform] = content;
      postContentIds[platform] = insertedContent.insertId;
    }

    // SNSアカウント情報を取得
    const accounts = await db
      .select()
      .from(snsAccounts)
      .where(eq(snsAccounts.companyName, schedule.companyName));

    // 各プラットフォームに投稿
    const postResults: any = {};

    for (const account of accounts) {
      const platform = account.platform;
      const content = contents[platform];

      if (!content) continue;

      try {
        let result;

        if (platform === 'instagram') {
          result = await snsApiService.postToInstagram({
            credentials: {
              accessToken: account.accessToken!,
              instagramBusinessAccountId: account.accountId || '',
            },
            imageUrl: photo.url,
            caption: `${content.caption}\n\n${content.hashtags.map((tag: string) => `#${tag}`).join(' ')}`,
          });
        } else if (platform === 'x') {
          // まず画像をアップロード
          const mediaId = await snsApiService.uploadMediaToX({
            credentials: {
              apiKey: account.apiKey!,
              apiSecret: account.apiSecret!,
              accessToken: account.accessToken!,
              accessTokenSecret: account.accessTokenSecret!,
            },
            imageUrl: photo.url,
          });

          // ツイートを投稿
          result = await snsApiService.postToX({
            credentials: {
              apiKey: account.apiKey!,
              apiSecret: account.apiSecret!,
              accessToken: account.accessToken!,
              accessTokenSecret: account.accessTokenSecret!,
            },
            text: `${content.caption}\n\n${content.hashtags.map((tag: string) => `#${tag}`).join(' ')}`,
            mediaIds: [mediaId],
          });
        } else if (platform === 'threads') {
          result = await snsApiService.postToThreads({
            credentials: {
              accessToken: account.accessToken!,
              threadsUserId: account.accountId || '',
            },
            text: `${content.caption}\n\n${content.hashtags.map((tag: string) => `#${tag}`).join(' ')}`,
            imageUrl: photo.url,
          });
        }

        // 投稿履歴を保存
        if (result) {
          const postUrl = platform === 'instagram' || platform === 'threads' 
            ? (result as snsApiService.InstagramPostResult | snsApiService.ThreadsPostResult).permalink
            : (result as snsApiService.XPostResult).url;

          await db.insert(postHistory).values({
            postScheduleId: schedule.id,
            postContentId: postContentIds[platform],
            platform,
            postId: result.id,
            postUrl,
            status: 'published',
          });
        }

        postResults[platform] = result;
      } catch (error: any) {
        console.error(`Failed to post to ${platform}:`, error);

        // エラーを履歴に記録
        await db.insert(postHistory).values({
          postScheduleId: schedule.id,
          postContentId: postContentIds[platform],
          platform,
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }

    // スケジュールのステータスを更新
    await db
      .update(postSchedules)
      .set({
        status: 'completed',
        lastExecutedAt: new Date(),
      })
      .where(eq(postSchedules.id, scheduleId));

    return {
      success: true,
      scheduleId,
      imageId,
      postResults,
    };
  } catch (error: any) {
    console.error('Scheduled post execution failed:', error);

    // スケジュールのステータスを更新
    await db
      .update(postSchedules)
      .set({
        status: 'failed',
        lastExecutedAt: new Date(),
      })
      .where(eq(postSchedules.id, scheduleId));

    throw error;
  }
}

/**
 * 定期実行ジョブを登録
 */
const registeredJobs = new Map<number, cron.ScheduledTask>();

export function registerScheduledJob(params: {
  scheduleId: number;
  cronExpression: string;
}) {
  const { scheduleId, cronExpression } = params;

  // 既存のジョブがあれば停止
  if (registeredJobs.has(scheduleId)) {
    registeredJobs.get(scheduleId)!.stop();
    registeredJobs.delete(scheduleId);
  }

  // 新しいジョブを登録
  const task = cron.schedule(cronExpression, async () => {
    console.log(`Executing scheduled post ${scheduleId}`);
    try {
      await executeScheduledPost(scheduleId);
      console.log(`Scheduled post ${scheduleId} completed successfully`);
    } catch (error) {
      console.error(`Scheduled post ${scheduleId} failed:`, error);
    }
  });

  registeredJobs.set(scheduleId, task);

  return task;
}

/**
 * スケジュールジョブを停止
 */
export function unregisterScheduledJob(scheduleId: number) {
  if (registeredJobs.has(scheduleId)) {
    registeredJobs.get(scheduleId)!.stop();
    registeredJobs.delete(scheduleId);
    return true;
  }
  return false;
}

/**
 * すべてのアクティブなスケジュールを読み込んで登録
 */
export async function loadActiveSchedules() {
  const db = await getDb();
  if (!db) {
    console.warn('Database not available, skipping schedule loading');
    return;
  }

  const activeSchedules = await db
    .select()
    .from(postSchedules)
    .where(eq(postSchedules.status, 'active'));

  for (const schedule of activeSchedules) {
    if (schedule.cronExpression) {
      registerScheduledJob({
        scheduleId: schedule.id,
        cronExpression: schedule.cronExpression,
      });
      console.log(`Registered schedule ${schedule.id}: ${schedule.cronExpression}`);
    }
  }

  console.log(`Loaded ${activeSchedules.length} active schedules`);
}

/**
 * cron式のヘルパー関数
 */
export const CronExpressions = {
  // 毎日午前9時
  DAILY_9AM: '0 9 * * *',
  // 毎日午後6時
  DAILY_6PM: '0 18 * * *',
  // 月水金の午前10時
  MON_WED_FRI_10AM: '0 10 * * 1,3,5',
  // 毎週月曜日の午前9時
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  // 毎時0分
  HOURLY: '0 * * * *',
};

/**
 * スケジュールされた投稿を更新
 */
export async function updateScheduledPost(scheduleId: number, scheduledAt: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  await db
    .update(postSchedules)
    .set({
      scheduledAt: new Date(scheduledAt),
      updatedAt: new Date(),
    })
    .where(eq(postSchedules.id, scheduleId));

  return { success: true };
}

/**
 * スケジュールされた投稿の一覧を取得
 */
export async function listScheduledPosts(userId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const conditions = userId ? eq(postSchedules.userId, userId) : undefined;

  const schedules = await db
    .select({
      id: postSchedules.id,
      userId: postSchedules.userId,
      companyName: postSchedules.companyName,
      scheduledAt: postSchedules.scheduledAt,
      status: postSchedules.status,
      createdAt: postSchedules.createdAt,
      platform: postContents.platform,
      caption: postContents.caption,
      hashtags: postContents.hashtags,
    })
    .from(postSchedules)
    .leftJoin(postContents, eq(postSchedules.id, postContents.postScheduleId))
    .where(conditions)
    .orderBy(postSchedules.scheduledAt);

  return schedules.map((schedule) => ({
    id: schedule.id,
    platform: schedule.platform || 'instagram',
    companyName: schedule.companyName || '不明',
    content: schedule.caption || '',
    scheduledAt: schedule.scheduledAt.toISOString(),
    status: schedule.status,
    createdAt: schedule.createdAt.toISOString(),
  }));
}
