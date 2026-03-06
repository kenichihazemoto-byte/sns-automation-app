import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as aiService from "./ai-service";
import { storagePut } from "./storage";
import { analyzeImage } from "./ai-service";
import { createNotionPage, testNotionConnection, fetchNotionChanges } from "./notion";
import { createScheduleFromNotion, getNotionSyncedSchedules } from "./db";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import { notionSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  user: router({
    updateProfile: protectedProcedure
      .input(z.object({
        companyName: z.string().optional(),
        industry: z.string().optional(),
        googlePhotoAlbums: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // SNS Account Management
  snsAccounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSnsAccountsByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        platform: z.enum(["instagram", "x", "threads"]),
        accountName: z.string(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        accessToken: z.string().optional(),
        accessTokenSecret: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        platformUserId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createSnsAccount({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        accountName: z.string().optional(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        accessToken: z.string().optional(),
        accessTokenSecret: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        platformUserId: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateSnsAccount(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSnsAccount(input.id);
        return { success: true };
      }),
  }),

  // Cloud Storage Management
  cloudStorage: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCloudStorageConfigsByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        provider: z.enum(["google_drive", "dropbox"]),
        folderPath: z.string(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCloudStorageConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        folderPath: z.string().optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateCloudStorageConfig(id, updates);
        return { success: true };
      }),
  }),

  // Image Management
  images: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getImagesByUserId(ctx.user.id, input.limit);
      }),

    unused: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getUnusedImages(ctx.user.id, input.limit);
      }),

    create: protectedProcedure
      .input(z.object({
        cloudStorageConfigId: z.number(),
        originalUrl: z.string(),
        s3Url: z.string().optional(),
        s3Key: z.string().optional(),
        fileName: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        analysisResult: z.string().optional(),
        imageCategory: z.string().optional(),
        imageStyle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createImage({
          userId: ctx.user.id,
          ...input,
        });
      }),

    // AI画像分析
    analyze: protectedProcedure
      .input(z.object({
        imageId: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const analysis = await aiService.analyzeImage(input.imageUrl);
        
        // 分析結果をデータベースに保存
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        const { images } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await dbInstance.update(images)
          .set({
            analysisResult: JSON.stringify(analysis),
            imageCategory: analysis.category,
            imageStyle: analysis.style,
          })
          .where(eq(images.id, input.imageId));

        return analysis;
      }),
  }),

  // Post Schedule Management
  posts: router({
    schedules: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPostSchedulesByUserId(ctx.user.id);
    }),

    createSchedule: protectedProcedure
      .input(z.object({
        imageId: z.number().optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        scheduledAt: z.date(),
        isBeforeAfter: z.boolean().optional(),
        beforeImageUrl: z.string().optional(),
        afterImageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scheduleId = await db.createPostSchedule({
          userId: ctx.user.id,
          imageId: input.imageId,
          companyName: input.companyName,
          scheduledAt: input.scheduledAt,
          status: "scheduled",
          isBeforeAfter: input.isBeforeAfter || false,
          beforeImageUrl: input.beforeImageUrl,
          afterImageUrl: input.afterImageUrl,
        });
        return { id: scheduleId };
      }),

    getSchedule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPostScheduleById(input.id);
      }),

    updateSchedule: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledAt: z.date().optional(),
        status: z.enum(["draft", "scheduled", "active", "pending", "processing", "completed", "failed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updatePostSchedule(id, updates);
        return { success: true };
      }),

    deleteSchedule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePostSchedule(input.id);
        return { success: true };
      }),

    deleteMultipleSchedules: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.deletePostSchedule(id);
        }
        return { success: true, count: input.ids.length };
      }),

    updateMultipleSchedules: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.updatePostSchedule(id, { scheduledAt: input.scheduledAt });
        }
        return { success: true, count: input.ids.length };
      }),

    upcomingSchedules: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getUpcomingPostSchedules(input.limit || 10);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "published", "failed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updatePostScheduleStatus(input.id, input.status);
        return { success: true };
      }),

    createContent: protectedProcedure
      .input(z.object({
        postScheduleId: z.number(),
        platform: z.enum(["instagram", "x", "threads"]),
        caption: z.string(),
        hashtags: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPostContent(input);
      }),

    // AI投稿コンテンツ生成
    generateContent: protectedProcedure
      .input(z.object({
        imageId: z.number(),
        platform: z.enum(["instagram", "x", "threads"]),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
      }))
      .mutation(async ({ input }) => {
        // 画像の分析結果を取得
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        const { images } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const imageResults = await dbInstance.select()
          .from(images)
          .where(eq(images.id, input.imageId))
          .limit(1);
        
        if (imageResults.length === 0) {
          throw new Error("Image not found");
        }

        const image = imageResults[0];
        if (!image.analysisResult) {
          throw new Error("Image has not been analyzed yet");
        }

        const imageAnalysis = JSON.parse(image.analysisResult) as aiService.ImageAnalysisResult;

        // AIでコンテンツを生成
        const content = await aiService.generatePostContent({
          platform: input.platform,
          imageAnalysis,
          companyName: input.companyName,
        });

        return content;
      }),

    getContents: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPostContentsByScheduleId(input.scheduleId);
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getPostHistoryByUserId(ctx.user.id, input.limit);
      }),

    historyBySchedule: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPostHistoryByScheduleId(input.scheduleId);
      }),

    markPublished: protectedProcedure
      .input(z.object({
        scheduleId: z.number(),
        platform: z.enum(["instagram", "x", "threads"]),
        postId: z.string().optional(),
        postUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.markPostAsPublished(
          input.scheduleId,
          input.platform,
          input.postId,
          input.postUrl
        );
        return { success: true };
      }),

    stats: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPostHistoryStats(ctx.user.id);
      }),
  }),

  // Analytics
  analytics: router({
    getByPostHistory: protectedProcedure
      .input(z.object({ postHistoryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAnalyticsByPostHistoryId(input.postHistoryId);
      }),

    create: protectedProcedure
      .input(z.object({
        postHistoryId: z.number(),
        likes: z.number().optional(),
        comments: z.number().optional(),
        shares: z.number().optional(),
        views: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createAnalytics(input);
      }),

    // Record engagement data with time information
    recordEngagement: protectedProcedure
      .input(z.object({
        postHistoryId: z.number(),
        likes: z.number().optional(),
        comments: z.number().optional(),
        shares: z.number().optional(),
        views: z.number().optional(),
        hourOfDay: z.number().min(0).max(23).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.upsertAnalytics(input);
        return { id, success: true };
      }),

    // Get analytics summary for the user
    getSummary: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAnalyticsSummary(ctx.user.id);
      }),

    // Get analytics by platform
    getByPlatform: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAnalyticsByPlatform(ctx.user.id);
      }),

    // Get analytics by hour of day
    getByHourOfDay: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAnalyticsByHourOfDay(ctx.user.id);
      }),

    // Get analytics by day of week
    getByDayOfWeek: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAnalyticsByDayOfWeek(ctx.user.id);
      }),
  }),

  // Comments
  comments: router({
    pending: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPendingComments(input.limit);
      }),

    create: protectedProcedure
      .input(z.object({
        postHistoryId: z.number(),
        platformCommentId: z.string(),
        authorName: z.string().optional(),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createComment(input);
      }),

    reply: protectedProcedure
      .input(z.object({
        id: z.number(),
        replyContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateCommentReply(input.id, input.replyContent);
        return { success: true };
      }),

    // AI自動返信生成
    generateReply: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        commentContent: z.string(),
        postContext: z.string(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
      }))
      .mutation(async ({ input }) => {
        const reply = await aiService.generateCommentReply({
          commentContent: input.commentContent,
          postContext: input.postContext,
          companyName: input.companyName,
        });

        return { reply };
      }),
  }),

  // デモ機能
  demo: router({
    uploadAndAnalyzeImage: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        fileName: z.string(),
        companyName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { imageBase64, fileName, companyName } = input;

        // Base64をBufferに変換
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // S3にアップロード
        const fileKey = `${ctx.user.id}-uploads/${Date.now()}-${fileName}`;
        const { url: imageUrl } = await storagePut(fileKey, buffer, 'image/jpeg');

        // AI画像分析
        const analysis = await analyzeImage(imageUrl);

        return {
          photo: {
            url: imageUrl,
            id: fileKey,
          },
          analysis,
        };
      }),
    // ランダムな竣工写真を取得してAI分析
    getRandomPhotoWithAnalysis: protectedProcedure
      .mutation(async () => {
        try {
          const googlePhotos = await import("./google-photos-service");
          const { photo, album } = await googlePhotos.getRandomConstructionPhoto();
          
          if (!photo || !photo.url) {
            throw new Error("Failed to fetch photo from Google Photos");
          }
          
          // 実際の写真URLを使用してAI分析
          const analysis = await aiService.analyzeImage(photo.url);
          
          return {
            id: photo.url, // 一意のIDとしてURLを使用
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            fileName: photo.title || `${album.year}年竣工写真`,
            albumTitle: album.title,
            albumYear: album.year,
            analysis,
          };
        } catch (error) {
          console.error("Error in getRandomPhotoWithAnalysis:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Googleフォトから写真を取得できませんでした: ${error instanceof Error ? error.message : "不明なエラー"}`,
          });
        }
      }),

    // AI投稿文生成デモ
    generatePostDemo: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "x", "threads"]),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        imageAnalysis: z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        }),
      }))
      .mutation(async ({ input }) => {
        const content = await aiService.generatePostContent({
          platform: input.platform,
          imageAnalysis: input.imageAnalysis,
          companyName: input.companyName,
        });

        return content;
      }),

    // 全プラットフォームの投稿文を一括生成
     generateAllPlatformContents: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        imageAnalysis: z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        }),
        todayEvent: z.string().optional(),
        userContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const platforms = ["instagram", "x", "threads"] as const;
        const contents: any = {};
        for (const platform of platforms) {
          contents[platform] = await aiService.generatePostContent({
            platform,
            imageAnalysis: input.imageAnalysis,
            companyName: input.companyName,
            todayEvent: input.todayEvent,
            userContext: input.userContext,
          });
        }
        return contents;
      }),

    // 生成した投稿を保存
    saveGeneratedPost: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        imageUrl: z.string(),
        imageAnalysis: z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        }),
        contents: z.object({
          instagram: z.object({
            caption: z.string(),
            hashtags: z.array(z.string()),
          }),
          x: z.object({
            caption: z.string(),
            hashtags: z.array(z.string()),
          }),
          threads: z.object({
            caption: z.string(),
            hashtags: z.array(z.string()),
          }),
        }),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 画像を保存
        const imageId = await db.createImage({
          userId: ctx.user.id,
          cloudStorageConfigId: 0, // Google Photosの場合は0
          originalUrl: input.imageUrl,
          s3Url: input.imageUrl,
          fileName: input.imageAnalysis.category || "photo",
          analysisResult: JSON.stringify(input.imageAnalysis),
          imageCategory: input.imageAnalysis.category,
          imageStyle: input.imageAnalysis.style,
        });

        // 投稿スケジュールを作成
        const scheduleId = await db.createPostSchedule({
          userId: ctx.user.id,
          imageId,
          scheduledAt: input.scheduledAt || new Date(),
          status: input.scheduledAt ? "scheduled" : "draft",
          companyName: input.companyName,
        });

        // 各プラットフォームの投稿コンテンツを保存
        const platforms = ["instagram", "x", "threads"] as const;
        for (const platform of platforms) {
          await db.createPostContent({
            postScheduleId: scheduleId,
            platform,
            caption: input.contents[platform].caption,
            hashtags: input.contents[platform].hashtags.join(","),
          });
        }

        return { scheduleId, imageId };
      }),

    // 保存した投稿一覧を取得
    getSavedPosts: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPostSchedulesByUserId(ctx.user.id);
      }),

    // 写真ごとの個別コメントを生成
    generateIndividualComments: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        platform: z.enum(["instagram", "x", "threads"]),
        imageAnalyses: z.array(z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        })),
      }))
      .mutation(async ({ input }) => {
        const { generateIndividualComment } = await import("./ai-service");
        const individualComments = [];

        for (const analysis of input.imageAnalyses) {
          const comment = await generateIndividualComment(
            analysis,
            input.companyName,
            input.platform
          );
          individualComments.push(comment);
        }

        return individualComments;
      }),

    // 複数枚まとめたカルーセル投稿を生成
    generateCarouselPost: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        platform: z.enum(["instagram", "x", "threads"]),
        imageAnalyses: z.array(z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        })),
      }))
      .mutation(async ({ input }) => {
        const { generateCombinedPost } = await import("./ai-service");
        
        const combinedPost = await generateCombinedPost(
          input.imageAnalyses,
          input.companyName,
          input.platform
        );

        return combinedPost;
      }),

    // 複数写真を取得して分析
    getMultiplePhotosWithAnalysis: protectedProcedure
      .input(z.object({
        count: z.number().min(2).max(10).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const errors: Array<{ photoIndex: number; reason: string; details: string }> = [];
        const MAX_RETRIES = 3; // 最大リトライ回数
        const BASE_RETRY_DELAY = 1000; // 基本リトライ間隔（ミリ秒）
        const MAX_RETRY_DELAY = 10000; // 最大リトライ間隔（ミリ秒）
        const FETCH_TIMEOUT = 30000; // フェッチタイムアウト（30秒）
        
        /**
         * 指数バックオフで待機時間を計算
         */
        const calculateBackoffDelay = (retryCount: number): number => {
          const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
          return Math.min(delay, MAX_RETRY_DELAY);
        };
        
        /**
         * タイムアウト付きで写真を取得
         */
        const fetchPhotoWithTimeout = async (timeoutMs: number) => {
          return Promise.race([
            (async () => {
              const googlePhotos = await import("./google-photos-service");
              return await googlePhotos.getRandomConstructionPhoto();
            })(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
            )
          ]);
        };
        
        try {
          const googlePhotos = await import("./google-photos-service");
          const photos = [];
          let attempts = 0;
          const maxAttempts = input.count * 2; // 指定枚数の2倍まで試行

          while (photos.length < input.count && attempts < maxAttempts) {
            let retryCount = 0;
            let success = false;
            
            while (!success && retryCount <= MAX_RETRIES) {
              try {
                // タイムアウト付きで写真を取得
                const { photo, album } = await fetchPhotoWithTimeout(FETCH_TIMEOUT);
                const analysis = await aiService.analyzeImage(photo.url);
                
                photos.push({
                  id: photo.url,
                  url: photo.url,
                  thumbnailUrl: photo.thumbnailUrl || photo.url,
                  fileName: photo.title || `${album.year}年端工写真`,
                  albumTitle: album.title,
                  albumYear: album.year,
                  analysis,
                  score: Math.random() * 100, // 仮のスコア（実際はAIが評価）
                });
                
                success = true;
                console.log(`[PhotoFetch] Successfully fetched photo ${photos.length}/${input.count}`);
              } catch (photoError) {
                retryCount++;
                console.error(`[PhotoFetch] Failed to fetch photo (attempt ${attempts + 1}, retry ${retryCount}/${MAX_RETRIES}):`, photoError);
                
                // 最後のリトライでなければ、指数バックオフで待機
                if (retryCount <= MAX_RETRIES) {
                  const backoffDelay = calculateBackoffDelay(retryCount - 1);
                  console.log(`[PhotoFetch] Waiting ${backoffDelay}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, backoffDelay));
                } else {
                  // 最大リトライ回数に達した場合、エラーを記録
                  let errorType = "unknown";
                  let reason = "不明なエラー";
                  let details = "";
                  
                  if (photoError instanceof Error) {
                    const errorMessage = photoError.message.toLowerCase();
                    
                    if (errorMessage.includes("timeout")) {
                      errorType = "timeout";
                      reason = "タイムアウト";
                      details = "写真の取得に時間がかかりすぎました。ネットワークが不安定な可能性があります。";
                    } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
                      errorType = "network";
                      reason = "ネットワークエラー";
                      details = "Google フォトへの接続に失敗しました。インターネット接続を確認してください。";
                    } else if (errorMessage.includes("album") || errorMessage.includes("not found")) {
                      errorType = "album_access";
                      reason = "アルバムアクセスエラー";
                      details = "アルバムにアクセスできませんでした。アルバムが公開設定になっているか確認してください。";
                    } else if (errorMessage.includes("no photos") || errorMessage.includes("no images")) {
                      errorType = "no_photos";
                      reason = "写真が見つからない";
                      details = "アルバムに写真が見つかりませんでした。";
                    } else if (errorMessage.includes("analyze") || errorMessage.includes("ai")) {
                      errorType = "ai_analysis";
                      reason = "AI分析エラー";
                      details = "写真のAI分析に失敗しました。もう一度お試しください。";
                    } else {
                      details = photoError.message;
                    }
                  }
                  
                  // エラーログをデータベースに保存
                  await db.createErrorLog({
                    userId: ctx.user.id,
                    errorType,
                    errorReason: reason,
                    errorDetails: details,
                    context: JSON.stringify({
                      photoIndex: attempts,
                      requestedCount: input.count,
                      successCount: photos.length,
                    }),
                  });
                  
                  errors.push({
                    photoIndex: attempts,
                    reason,
                    details,
                  });
                }
              }
            }
            
            attempts++;
          }

          if (photos.length === 0) {
            throw new Error("写真の取得に失敗しました。もう一度お試しください。");
          }

          // スコアでソート
          photos.sort((a, b) => b.score - a.score);
          
          // 成功メッセージ
          const message = photos.length < input.count 
            ? `${photos.length}枚の写真を取得しました（${input.count - photos.length}枚は取得に失敗しました）`
            : `${photos.length}枚の写真を取得しました`;

          return { photos, errors, message };
        } catch (error) {
          console.error("Error in getMultiplePhotosWithAnalysis:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "写真の取得に失敗しました",
          });
        }
      }),

    // テンプレート一覧を取得
    getTemplates: protectedProcedure
      .input(z.object({
        companyName: z.enum(["\u30cf\u30bc\u30e2\u30c8\u5efa\u8a2d", "\u30af\u30ea\u30cb\u30c3\u30af\u30a2\u30fc\u30ad\u30d7\u30ed"]).optional(),
      }))
      .query(async ({ input }) => {
        const { POST_TEMPLATES, getTemplatesByCompany } = await import("../shared/templates");
        
        if (input.companyName) {
          return getTemplatesByCompany(input.companyName);
        }
        
        return POST_TEMPLATES;
      }),

    // テンプレートを使用して投稿文を生成
    generatePostFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        platform: z.enum(["instagram", "x", "threads"]),
        imageAnalysis: z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        }),
        imageUrl: z.string().optional(),
        variables: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { getTemplateById } = await import("../shared/templates");
        const { generatePostFromTemplate, extractTemplateVariables, generateTemplateVariables, replaceTemplateVariables } = await import("./ai-service");
        
        const template = getTemplateById(input.templateId);
        if (!template) {
          throw new Error(`Template not found: ${input.templateId}`);
        }

        let result = await generatePostFromTemplate({
          template: {
            name: template.name,
            structure: template.structure,
            tone: template.tone,
            recommendedHashtags: template.recommendedHashtags,
          },
          imageAnalysis: input.imageAnalysis,
          platform: input.platform,
          companyName: template.companyName,
        });

        // 変数置換処理
        const templateVariables = extractTemplateVariables(result.content);
        if (templateVariables.length > 0) {
          let variableValues = input.variables || {};
          
          // 未指定の変数がAIで自動生成
          const missingVariables = templateVariables.filter(v => !variableValues[v]);
          if (missingVariables.length > 0 && input.imageUrl) {
            const autoGenerated = await generateTemplateVariables(
              input.imageUrl,
              missingVariables,
              template.companyName
            );
            variableValues = { ...variableValues, ...autoGenerated };
          }
          
          result.content = replaceTemplateVariables(result.content, variableValues);
        }

        return result;
      }),

    // ビフォーアフター投稿文を生成
    generateBeforeAfterPost: protectedProcedure
      .input(z.object({
        beforeImageUrl: z.string(),
        afterImageUrl: z.string(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        platform: z.enum(["instagram", "x", "threads"]),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateBeforeAfterPost } = await import("./ai-service");
        
        const result = await generateBeforeAfterPost({
          beforeImageUrl: input.beforeImageUrl,
          afterImageUrl: input.afterImageUrl,
          companyName: input.companyName,
          platform: input.platform,
          additionalContext: input.additionalContext,
        });

        return result;
      }),

    // すべてのプラットフォーム向けに一括生成
    generateBeforeAfterPostForAllPlatforms: protectedProcedure
      .input(z.object({
        beforeImageUrl: z.string(),
        afterImageUrl: z.string(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateBeforeAfterPost } = await import("./ai-service");
        
        // Instagram, X, Threadsの3つのプラットフォーム向けに並列生成
        const platforms: ("instagram" | "x" | "threads")[] = ["instagram", "x", "threads"];
        
        const results = await Promise.all(
          platforms.map(async (platform) => {
            const result = await generateBeforeAfterPost({
              beforeImageUrl: input.beforeImageUrl,
              afterImageUrl: input.afterImageUrl,
              companyName: input.companyName,
              platform,
              additionalContext: input.additionalContext,
            });
            
            return {
              platform,
              ...result,
            };
          })
        );

        return {
          instagram: results.find(r => r.platform === "instagram"),
          x: results.find(r => r.platform === "x"),
          threads: results.find(r => r.platform === "threads"),
        };
      }),

    // アップロード履歴を保存
    saveUploadHistory: protectedProcedure
      .input(z.object({
        companyName: z.string().optional(),
        title: z.string().optional(),
        photoData: z.string(), // JSON string of photo array
        photoCount: z.number(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createUploadHistory({
          userId: ctx.user.id,
          companyName: input.companyName || null,
          title: input.title || null,
          photoData: input.photoData,
          photoCount: input.photoCount,
          tags: input.tags ? JSON.stringify(input.tags) : null,
        });
        return { success: true, id };
      }),

    // アップロード履歴を取得
    getUploadHistory: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUploadHistoryByUserId(ctx.user.id);
      }),

    // アップロード履歴を削除
    deleteUploadHistory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUploadHistory(input.id);
        return { success: true };
      }),
  }),

  // Custom Templates Management
  customTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCustomTemplatesByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomTemplateById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        baseTemplateId: z.string().optional(),
        name: z.string(),
        description: z.string().optional(),
        structure: z.object({
          opening: z.string(),
          body: z.string(),
          cta: z.string(),
        }),
        hashtags: z.array(z.string()),
        targetAudience: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createCustomTemplate({
          userId: ctx.user.id,
          baseTemplateId: input.baseTemplateId || null,
          name: input.name,
          description: input.description || null,
          structure: JSON.stringify(input.structure),
          hashtags: input.hashtags.join(", "),
          targetAudience: input.targetAudience || null,
        });
        return { success: true, id: Number(result[0].insertId) };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        structure: z.object({
          opening: z.string(),
          body: z.string(),
          cta: z.string(),
        }).optional(),
        hashtags: z.array(z.string()).optional(),
        targetAudience: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description || null;
        if (input.structure) updateData.structure = JSON.stringify(input.structure);
        if (input.hashtags) updateData.hashtags = input.hashtags.join(", ");
        if (input.targetAudience !== undefined) updateData.targetAudience = input.targetAudience || null;

        await db.updateCustomTemplate(input.id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCustomTemplate(input.id);
        return { success: true };
      }),

    generatePost: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        platform: z.enum(["instagram", "x", "threads"]),
        imageAnalysis: z.object({
          description: z.string(),
          category: z.string(),
          style: z.string(),
          keywords: z.array(z.string()),
          score: z.number(),
        }),
      }))
      .mutation(async ({ input }) => {
        const template = await db.getCustomTemplateById(input.templateId);
        if (!template) {
          throw new Error("テンプレートが見つかりません");
        }

        const structure = JSON.parse(template.structure);
        const result = await aiService.generatePostFromTemplate({
          template: {
            name: template.name,
            structure: structure,
            tone: "friendly",
            recommendedHashtags: template.hashtags.split(", "),
          },
          imageAnalysis: input.imageAnalysis,
          platform: input.platform,
          companyName: template.targetAudience || "ハゼモト建設",
        });

        return {
          content: result.content,
          hashtags: template.hashtags,
        };
      }),

    linkDataSources: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        dataSourceIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.linkTemplateDataSources(input.templateId, input.dataSourceIds);
        return { success: true };
      }),

    getLinkedDataSources: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDataSourcesByTemplateId(input.templateId);
      }),
  }),

  // Scheduler Management
  // Approval Workflow
  approval: router({
    // Create draft post (for users)
    createDraft: protectedProcedure
      .input(z.object({
        imageId: z.number().optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        platform: z.enum(["instagram", "x", "threads"]),
        postContent: z.string(),
        hashtags: z.string(),
        scheduledAt: z.string(),
        isBeforeAfter: z.boolean().optional(),
        beforeImageUrl: z.string().optional(),
        afterImageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const draftPost = await db.createDraftPost({
          userId: ctx.user.id,
          imageId: input.imageId,
          companyName: input.companyName,
          platform: input.platform,
          postContent: input.postContent,
          hashtags: input.hashtags,
          scheduledAt: new Date(input.scheduledAt),
          isBeforeAfter: input.isBeforeAfter || false,
          beforeImageUrl: input.beforeImageUrl,
          afterImageUrl: input.afterImageUrl,
        });
        return draftPost;
      }),

    // Get pending drafts (for admins)
    getPendingDrafts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view pending drafts");
      }
      return await db.getPendingDraftPosts();
    }),

    // Get user's own drafts
    getMyDrafts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDraftPostsByUserId(ctx.user.id);
    }),

    // Approve draft (for admins)
    approveDraft: protectedProcedure
      .input(z.object({
        draftId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only admins can approve drafts");
        }

        const draft = await db.getDraftPostById(input.draftId);
        if (!draft) {
          throw new Error("Draft not found");
        }

        // Update draft status
        await db.updateDraftPostStatus(input.draftId, "approved");

        // Create approval history
        await db.createApprovalHistory({
          draftPostId: input.draftId,
          reviewerId: ctx.user.id,
          action: "approved",
        });

        // Create scheduled post
        const schedule = await db.createPostSchedule({
          userId: draft.userId,
          imageId: draft.imageId,
          companyName: draft.companyName,
          scheduledAt: draft.scheduledAt,
          isBeforeAfter: draft.isBeforeAfter,
          beforeImageUrl: draft.beforeImageUrl,
          afterImageUrl: draft.afterImageUrl,
        });

        // Create post content
        await db.createPostContent({
          postScheduleId: schedule,
          platform: draft.platform,
          caption: draft.postContent,
          hashtags: draft.hashtags,
        });

        return { success: true, scheduleId: schedule };
      }),

    // Reject draft (for admins)
    rejectDraft: protectedProcedure
      .input(z.object({
        draftId: z.number(),
        feedback: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only admins can reject drafts");
        }

        // Update draft status
        await db.updateDraftPostStatus(input.draftId, "rejected");

        // Create approval history with feedback
        await db.createApprovalHistory({
          draftPostId: input.draftId,
          reviewerId: ctx.user.id,
          action: "rejected",
          feedback: input.feedback,
        });

        return { success: true };
      }),

    // Get approval history for a draft
    getApprovalHistory: protectedProcedure
      .input(z.object({
        draftId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getApprovalHistoryByDraftPostId(input.draftId);
      }),

    // Delete draft
    deleteDraft: protectedProcedure
      .input(z.object({
        draftId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const draft = await db.getDraftPostById(input.draftId);
        if (!draft) {
          throw new Error("Draft not found");
        }

        // Only the creator or admin can delete
        if (draft.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Permission denied");
        }

        await db.deleteDraftPost(input.draftId);
        return { success: true };
      }),
  }),

  scheduler: router({
    listScheduledPosts: protectedProcedure.query(async ({ ctx }) => {
      const schedulerService = await import('./scheduler-service');
      return await schedulerService.listScheduledPosts(ctx.user.id);
    }),

    updateScheduledPost: protectedProcedure
      .input(z.object({
        id: z.number(),
        scheduledAt: z.string(),
      }))
      .mutation(async ({ input }) => {
        const schedulerService = await import('./scheduler-service');
        return await schedulerService.updateScheduledPost(input.id, input.scheduledAt);
      }),
  }),

  // Activity Log Management
  activityLog: router({
    // Create activity log
    create: protectedProcedure
      .input(z.object({
        activityType: z.enum(["photo_upload", "post_generation", "post_schedule", "post_approval", "post_publish", "template_create", "template_edit"]),
        description: z.string(),
        status: z.enum(["success", "failed"]),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createActivityLog({
          userId: ctx.user.id,
          ...input,
        });
      }),

    // Get user's activity logs
    getUserLogs: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.userId || ctx.user.id;
        return await db.getUserActivityLogs(userId, input.limit);
      }),

    // Get all users' activity logs (admin only)
    getAllLogs: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Permission denied: Admin only");
        }
        return await db.getAllUsersActivityLogs(input.limit);
      }),

    // Get user activity stats
    getStats: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.userId || ctx.user.id;
        return await db.getUserActivityStats(userId);
      }),

    // Get activity trends by date range
    getTrends: protectedProcedure
      .input(z.object({
        userId: z.number().optional().nullable(),
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]),
      }))
      .query(async ({ ctx, input }) => {
        // 管理者以外は自分のデータのみ
        const userId = ctx.user.role === "admin" && input.userId !== undefined 
          ? input.userId 
          : ctx.user.id;
        
        return await db.getActivityTrendsByDateRange(
          userId,
          input.startDate,
          input.endDate,
          input.groupBy
        );
      }),
  }),

  // Feedback Management
  feedback: router({
    // Create feedback (admin only)
    create: protectedProcedure
      .input(z.object({
        userId: z.number(),
        activityLogId: z.number().optional(),
        feedbackType: z.enum(["praise", "suggestion", "correction"]),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Permission denied: Admin only");
        }
        return await db.createUserFeedback({
          ...input,
          supervisorId: ctx.user.id,
        });
      }),

    // Get user's feedback
    getUserFeedback: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.userId || ctx.user.id;
        return await db.getUserFeedback(userId, input.limit);
      }),

    // Get all users' feedback (admin only)
    getAllFeedback: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Permission denied: Admin only");
        }
        return await db.getAllUsersFeedback(input.limit);
      }),

    // Get unread feedback count
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUnreadFeedbackCount(ctx.user.id);
      }),

    // Mark feedback as read
    markAsRead: protectedProcedure
      .input(z.object({
        feedbackId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.markFeedbackAsRead(input.feedbackId);
        return { success: true };
      }),
  }),

  // Photo Tagging
  photoTags: router({
    // Extract tags from analysis result
    extractTags: protectedProcedure
      .input(z.object({
        analysisResult: z.string(),
      }))
      .query(({ input }) => {
        return db.extractTagsFromAnalysis(input.analysisResult);
      }),

    // Update tags for upload history
    updateHistoryTags: protectedProcedure
      .input(z.object({
        historyId: z.number(),
        tags: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        await db.updateUploadHistoryTags(input.historyId, input.tags);
        return { success: true };
      }),

    // Search upload history by tags
    searchByTags: protectedProcedure
      .input(z.object({
        tags: z.array(z.string()),
      }))
      .query(async ({ ctx, input }) => {
        return await db.searchUploadHistoryByTags(ctx.user.id, input.tags);
      }),
  }),

  // Optimal Posting Time
  optimalTiming: router({
    // Get optimal posting times based on historical data
    getOptimalTimes: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getOptimalPostingTimes(ctx.user.id);
      }),

    // Suggest optimal posting time for a new post
    suggestTime: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.suggestPostingTime(ctx.user.id);
      }),
  }),

  // Favorite Images Router
  favoriteImages: router({
    list: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getFavoriteImages(ctx.user.id, input.companyName);
      }),

    create: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        imageUrl: z.string(),
        score: z.number().optional(),
        analysis: z.string().optional(),
        tags: z.string().optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createFavoriteImage({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateFavoriteImage(input.id, ctx.user.id, {
          title: input.title,
          notes: input.notes,
          tags: input.tags,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFavoriteImage(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  
  // エラー統計
  errorStats: router({
    // エラーログ一覧を取得
    getErrorLogs: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(1000).default(100),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getErrorLogsByUser(ctx.user.id, input.limit);
      }),
    
    // エラー統計を取得
    getStats: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(365).default(30),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getErrorStatsByUser(ctx.user.id, input.days);
      }),
    
    // 写真取得の成功率を取得
    getPhotoFetchSuccessRate: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(90).default(7),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getPhotoFetchSuccessRate(ctx.user.id, input.days);
      }),
    
    // 写真取得の成功率を記録
    recordPhotoFetchSuccessRate: protectedProcedure
      .input(z.object({
        successRate: z.number().min(0).max(100),
        totalAttempts: z.number().min(0),
        successCount: z.number().min(0),
        failureCount: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.recordPhotoFetchSuccessRate(
          ctx.user.id,
          input.successRate,
          input.totalAttempts,
          input.successCount,
          input.failureCount
        );
        return { success: true };
      }),
  }),

  // Post Drafts Management
  postDrafts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPostDraftsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getPostDraftById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        title: z.string().optional(),
        isBeforeAfter: z.boolean().optional(),
        beforeImageUrl: z.string().optional(),
        afterImageUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        instagramContent: z.string().optional(),
        instagramHashtags: z.string().optional(),
        xContent: z.string().optional(),
        xHashtags: z.string().optional(),
        threadsContent: z.string().optional(),
        threadsHashtags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const draftId = await db.createPostDraft({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true, id: draftId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]).optional(),
        isBeforeAfter: z.boolean().optional(),
        beforeImageUrl: z.string().optional(),
        afterImageUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        instagramContent: z.string().optional(),
        instagramHashtags: z.string().optional(),
        xContent: z.string().optional(),
        xHashtags: z.string().optional(),
        threadsContent: z.string().optional(),
        threadsHashtags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updatePostDraft(id, ctx.user.id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePostDraft(input.id, ctx.user.id);
        return { success: true };
      }),

    // 複数画像から一括で投稿を生成して下書き保存
    generateBulkFromImages: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        images: z.array(z.object({
          url: z.string(),
          analysis: z.object({
            category: z.string(),
            style: z.string(),
            description: z.string(),
            keywords: z.array(z.string()),
          }),
          fileName: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { companyName, images } = input;
        const createdDrafts = [];

        for (const image of images) {
          try {
            // 各プラットフォーム向けに投稿文を生成
            const [instagramPost, xPost, threadsPost] = await Promise.all([
              aiService.generatePostContent({
                platform: "instagram",
                imageAnalysis: image.analysis,
                companyName,
              }),
              aiService.generatePostContent({
                platform: "x",
                imageAnalysis: image.analysis,
                companyName,
              }),
              aiService.generatePostContent({
                platform: "threads",
                imageAnalysis: image.analysis,
                companyName,
              }),
            ]);

            // 下書きとして保存
            const draftId = await db.createPostDraft({
              userId: ctx.user.id,
              companyName,
              title: `${image.analysis.category} - ${new Date().toLocaleDateString("ja-JP")}`,
              isBeforeAfter: false,
              imageUrl: image.url,
              instagramContent: instagramPost.caption,
              instagramHashtags: instagramPost.hashtags.join(", "),
              xContent: xPost.caption,
              xHashtags: xPost.hashtags.join(", "),
              threadsContent: threadsPost.caption,
              threadsHashtags: threadsPost.hashtags.join(", "),
            });

            createdDrafts.push({
              id: draftId,
              imageUrl: image.url,
              title: `${image.analysis.category} - ${new Date().toLocaleDateString("ja-JP")}`,
            });
          } catch (error) {
            console.error(`Failed to generate post for image ${image.url}:`, error);
            // エラーが発生しても続行
          }
        }

        return {
          success: true,
          createdCount: createdDrafts.length,
          drafts: createdDrafts,
        };
      }),
  }),

  // Post Templates Management
  postTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPostTemplatesByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPostTemplateById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        isBeforeAfter: z.boolean().optional(),
        instagramCaption: z.string().optional(),
        instagramHashtags: z.string().optional(),
        xCaption: z.string().optional(),
        xHashtags: z.string().optional(),
        threadsCaption: z.string().optional(),
        threadsHashtags: z.string().optional(),
        defaultPostTime: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const templateId = await db.createPostTemplate({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true, id: templateId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]).optional(),
        isBeforeAfter: z.boolean().optional(),
        instagramCaption: z.string().optional(),
        instagramHashtags: z.string().optional(),
        xCaption: z.string().optional(),
        xHashtags: z.string().optional(),
        threadsCaption: z.string().optional(),
        threadsHashtags: z.string().optional(),
        defaultPostTime: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updatePostTemplate(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePostTemplate(input.id);
        return { success: true };
      }),
  }),

  // Data Sources Management
  dataSources: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDataSourcesByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        provider: z.enum(["google_photos", "dropbox", "onedrive", "local"]),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        albumId: z.string().optional(),
        folderId: z.string().optional(),
        folderPath: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createDataSource({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        albumId: z.string().optional(),
        folderId: z.string().optional(),
        folderPath: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateDataSource(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDataSource(input.id);
        return { success: true };
      }),

    getByTemplateId: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getDataSourcesByTemplateId(input.templateId);
      }),

    linkToTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        dataSourceId: z.number(),
        priority: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.linkTemplateToDataSource(input.templateId, input.dataSourceId, input.priority);
        return { success: true };
      }),

    unlinkFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        dataSourceId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.unlinkTemplateFromDataSource(input.templateId, input.dataSourceId);
        return { success: true };
      }),

    updatePriority: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        dataSourceId: z.number(),
        priority: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTemplateDataSourcePriority(input.templateId, input.dataSourceId, input.priority);
        return { success: true };
      }),

    // Google フォトのアルバム一覧を取得
    getGooglePhotosAlbums: protectedProcedure
      .input(z.object({
        dataSourceId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const dataSource = await db.getDataSourceById(input.dataSourceId);
        if (!dataSource || dataSource.provider !== "google_photos") {
          throw new Error("Invalid data source");
        }

        if (!dataSource.accessToken) {
          throw new Error("Access token not found");
        }

        // Google Photos APIでアルバム一覧を取得
        const response = await fetch(
          "https://photoslibrary.googleapis.com/v1/albums",
          {
            headers: {
              Authorization: `Bearer ${dataSource.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch albums from Google Photos");
        }

        const data = await response.json();
        return data.albums || [];
      }),

    // 指定したアルバムから写真を取得
    getPhotosFromAlbum: protectedProcedure
      .input(z.object({
        dataSourceId: z.number(),
        albumId: z.string(),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const dataSource = await db.getDataSourceById(input.dataSourceId);
        if (!dataSource || dataSource.provider !== "google_photos") {
          throw new Error("Invalid data source");
        }

        if (!dataSource.accessToken) {
          throw new Error("Access token not found");
        }

        // Google Photos APIでアルバム内の写真を取得
        const response = await fetch(
          "https://photoslibrary.googleapis.com/v1/mediaItems:search",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${dataSource.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              albumId: input.albumId,
              pageSize: input.pageSize,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch photos from album");
        }

        const data = await response.json();
        return data.mediaItems || [];
      }),

    // テンプレートに紐付けられた接続先から写真を取得（フォールバック対応）
    getPhotosFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        // テンプレートに紐付けられた接続先を優先順位順に取得
        const dataSources = await db.getDataSourcesByTemplateId(input.templateId);
        
        if (!dataSources || dataSources.length === 0) {
          throw new Error("No data sources linked to this template");
        }

        const errors: string[] = [];

        // 優先順位順に試行
        for (const dataSource of dataSources) {
          try {
            if (!dataSource.isActive) {
              errors.push(`Data source ${dataSource.name} is inactive`);
              continue;
            }

            if (dataSource.provider === "google_photos") {
              if (!dataSource.accessToken) {
                errors.push(`Data source ${dataSource.name} has no access token`);
                continue;
              }

              // Google Photos APIで写真を取得
              const url = dataSource.albumId
                ? "https://photoslibrary.googleapis.com/v1/mediaItems:search"
                : "https://photoslibrary.googleapis.com/v1/mediaItems";

              const options: RequestInit = {
                headers: {
                  Authorization: `Bearer ${dataSource.accessToken}`,
                  "Content-Type": "application/json",
                },
              };

              if (dataSource.albumId) {
                options.method = "POST";
                options.body = JSON.stringify({
                  albumId: dataSource.albumId,
                  pageSize: input.pageSize,
                });
              }

              const response = await fetch(url, options);

              if (!response.ok) {
                errors.push(`Data source ${dataSource.name} failed: ${response.statusText}`);
                continue;
              }

              const data = await response.json();
              const photos = data.mediaItems || [];

              if (photos.length > 0) {
                return {
                  photos,
                  dataSource: {
                    id: dataSource.id,
                    name: dataSource.name,
                    provider: dataSource.provider,
                  },
                  fallbackLog: errors,
                };
              } else {
                errors.push(`Data source ${dataSource.name} returned no photos`);
              }
            } else {
              errors.push(`Data source ${dataSource.name} provider not supported yet`);
            }
          } catch (error: any) {
            errors.push(`Data source ${dataSource.name} error: ${error.message}`);
          }
        }

        // すべての接続先が失敗した場合
        throw new Error(`All data sources failed. Errors: ${errors.join(", ")}`);
      }),
  }),

  // Template Performance Stats
  templatePerformance: router({
    // Record a post generation attempt
    record: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        dataSourceId: z.number().optional(),
        success: z.boolean(),
        platform: z.enum(["instagram", "x", "threads"]).optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.recordTemplatePerformance({
          templateId: input.templateId,
          dataSourceId: input.dataSourceId || null,
          success: input.success,
          platform: input.platform,
          companyName: input.companyName,
        });
        return { success: true };
      }),

    // Get performance stats with filters
    getStats: protectedProcedure
      .input(z.object({
        templateId: z.number().optional(),
        dataSourceId: z.number().optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(), // ISO date string
        platform: z.enum(["instagram", "x", "threads"]).optional(),
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getTemplatePerformanceStats({
          templateId: input.templateId,
          dataSourceId: input.dataSourceId,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          platform: input.platform,
          companyName: input.companyName,
        });
      }),

    // Get aggregated summary
    getSummary: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getTemplatePerformanceSummary({
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),
  }),

  // バッジシステム
  badges: router({
    getMyBadges: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBadges(ctx.user.id);
    }),
    checkAndAward: protectedProcedure.mutation(async ({ ctx }) => {
      const awarded = await db.checkAndAwardBadges(ctx.user.id);
      return { awarded };
    }),
  }),

  // 今日のタスク進捗
  dailyTask: router({
    getToday: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTodayTaskProgress(ctx.user.id);
    }),
    getWeeklyStats: protectedProcedure.query(async ({ ctx }) => {
      return await db.getWeeklyTaskStats(ctx.user.id);
    }),
    updateProgress: protectedProcedure
      .input(z.object({
        completedPostCount: z.number(),
        targetPostCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertTodayTaskProgress(ctx.user.id, input.completedPostCount, input.targetPostCount ?? 1);
        // バッジチェック
        const awarded = await db.checkAndAwardBadges(ctx.user.id);
        return { success: true, newBadges: awarded };
      }),
  }),

  // 投稿品質スコアリング
  postQuality: router({
    score: protectedProcedure
      .input(z.object({
        postText: z.string(),
        platform: z.enum(["instagram", "x", "threads"]),
        companyName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const prompt = `あなたはSNS投稿の品質評価専門家です。以下の投稿文を100点満点で採点してください。

投稿文:
${input.postText}

会社名: ${input.companyName}
プラットフォーム: ${input.platform}

以下の5項目で採点し、JSON形式で返してください：
1. brand_voice（30点）: ハゼモト建設らしい温かみのある語り口か
2. community_contribution（20点）: 地域密着・地域貢献の要素があるか
3. readability（20点）: 読みやすさ（適切な文字数・改行・構成）
4. hashtags（15点）: ハッシュタグの適切さと数
5. cta（15点）: 行動を促すCTA（コール・トゥ・アクション）が含まれているか

返答フォーマット（JSONのみ）:
{
  "total": 数値,
  "brand_voice": 数値,
  "community_contribution": 数値,
  "readability": 数値,
  "hashtags": 数値,
  "cta": 数値,
  "feedback": "改善のための具体的なアドバイス（100文字以内）",
  "pass": true/false（70点以上でtrue）
}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたはSNS投稿品質評価の専門家です。必ずJSONのみで返答してください。" },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        try {
          return JSON.parse(content);
        } catch {
          return { total: 0, pass: false, feedback: "採点に失敗しました" };
        }
      }),

    // 投稿文修正提案
    refine: protectedProcedure
      .input(z.object({
        postText: z.string(),
        platform: z.enum(["instagram", "x", "threads"]),
        refineType: z.enum(["shorter", "friendlier", "more_hashtags", "add_cta", "regenerate"]),
        companyName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const refineInstructions: Record<string, string> = {
          shorter: "投稿文をより短く、簡潔にしてください。重要なメッセージを残しながら、文字数を30%程度削減してください。",
          friendlier: "投稿文をより親しみやすく、温かみのある語り口に変えてください。専門用語を避け、読者に語りかけるような文体にしてください。",
          more_hashtags: "投稿文に関連するハッシュタグを5〜10個追加してください。北九州・ハゼモト建設・地域貢献に関連するハッシュタグを含めてください。",
          add_cta: "投稿文の最後に、読者の行動を促すCTA（プロフィールのリンクへ誘導、DMでのお問い合わせ促進など）を追加してください。",
          regenerate: "この投稿文を全く新しい切り口で書き直してください。同じ内容でも、異なる視点や表現で魅力的な投稿文を作成してください。",
        };
        const instruction = refineInstructions[input.refineType];
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `あなたは「地元で生まれ地元で育った北九州の工務店」ハゼモト建設の公式アカウントです。温かみのある語り口で、地域密着・地域貢献を大切にした投稿文を作成します。「SNS担当」「広報担当」などの役職表記は絶対に使わない。${input.platform}向けに最適化してください。` },
            { role: "user", content: `以下の投稿文を修正してください。\n\n指示: ${instruction}\n\n元の投稿文:\n${input.postText}\n\n修正後の投稿文のみを返してください。` },
          ],
        });
        const refined = response.choices[0]?.message?.content ?? input.postText;
        return { refinedText: refined };
      }),
   }),

  // Notion連携ルーター
  notion: router({
    // Notion設定の取得
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const db2 = await db.getDb();
      if (!db2) return null;
      const rows = await db2.select().from(notionSettings)
        .where(eq(notionSettings.userId, ctx.user.id))
        .limit(1);
      if (rows.length === 0) return null;
      const s = rows[0];
      // トークンはマスクして返す
      return {
        id: s.id,
        databaseId: s.databaseId,
        databaseTitle: s.databaseTitle,
        isActive: s.isActive,
        tokenMasked: s.integrationToken ? `***${s.integrationToken.slice(-4)}` : "",
      };
    }),

    // Notion設定の保存（接続テストも実行）
    saveSettings: protectedProcedure
      .input(z.object({
        integrationToken: z.string().min(1),
        databaseId: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // 接続テスト
        const test = await testNotionConnection(input.integrationToken, input.databaseId);
        if (!test.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Notion接続エラー: ${test.error ?? "不明なエラー"}`
          });
        }
        const db2 = await db.getDb();
        if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DBに接続できません" });
        // upsert
        const existing = await db2.select().from(notionSettings)
          .where(eq(notionSettings.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db2.update(notionSettings)
            .set({
              integrationToken: input.integrationToken,
              databaseId: input.databaseId,
              databaseTitle: test.databaseTitle,
              isActive: 1,
            })
            .where(eq(notionSettings.userId, ctx.user.id));
        } else {
          await db2.insert(notionSettings).values({
            userId: ctx.user.id,
            integrationToken: input.integrationToken,
            databaseId: input.databaseId,
            databaseTitle: test.databaseTitle,
            isActive: 1,
          });
        }
        return { success: true, databaseTitle: test.databaseTitle };
      }),

    // Notion接続テスト
    testConnection: protectedProcedure
      .input(z.object({
        integrationToken: z.string().min(1),
        databaseId: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        return await testNotionConnection(input.integrationToken, input.databaseId);
      }),

    // 投稿をNotionに同期
    syncPost: protectedProcedure
      .input(z.object({
        title: z.string(),
        platform: z.string(),
        companyName: z.string(),
        postText: z.string(),
        scheduledAt: z.string().optional(),
        status: z.enum(["draft", "scheduled", "posted", "failed"]),
        hashtags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await db.getDb();
        if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DBに接続できません" });
        const rows = await db2.select().from(notionSettings)
          .where(eq(notionSettings.userId, ctx.user.id)).limit(1);
        if (rows.length === 0 || !rows[0].isActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Notion連携が設定されていません。設定画面から先にNotionを連携してください。" });
        }
        const setting = rows[0];
        const result = await createNotionPage(
          setting.integrationToken,
          setting.databaseId,
          {
            title: input.title,
            platform: input.platform,
            companyName: input.companyName,
            postText: input.postText,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
            status: input.status,
            hashtags: input.hashtags,
          }
        );
        return { success: true, pageId: result.pageId, url: result.url };
      }),

    // Notion連携の無効化
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const db2 = await db.getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DBに接続できません" });
      await db2.update(notionSettings)
        .set({ isActive: 0 })
        .where(eq(notionSettings.userId, ctx.user.id));
      return { success: true };
    }),

    // Notionから変更を取得してアプリに反映する（双方向同期）
    syncFromNotion: protectedProcedure
      .input(z.object({
        sinceHours: z.number().min(1).max(168).default(24), // 何時間前からの変更を取得するか（最大：7日）
      }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await db.getDb();
        if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DBに接続できません" });

        const rows = await db2.select().from(notionSettings)
          .where(eq(notionSettings.userId, ctx.user.id)).limit(1);

        if (!rows.length || !rows[0].isActive || !rows[0].integrationToken || !rows[0].databaseId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Notion連携が設定されていません" });
        }

        const sinceDate = new Date();
        sinceDate.setHours(sinceDate.getHours() - input.sinceHours);

        const changes = await fetchNotionChanges(
          rows[0].integrationToken,
          rows[0].databaseId,
          sinceDate
        );

        // 取得した変更をアプリ内のデータに反映する
        // 現時点では変更内容を返す（UI側で表示し、ユーザーが確認できる）
        return {
          syncedCount: changes.length,
          changes: changes.map(c => ({
            pageId: c.pageId,
            title: c.title,
            platform: c.platform,
            companyName: c.companyName,
            status: c.status,
            scheduledAt: c.scheduledAt?.toISOString() ?? null,
            postText: c.postText ?? "",
            hashtags: c.hashtags ?? "",
            lastEditedAt: c.lastEditedAt.toISOString(),
          })),
        };
      }),

    // Notion予約日時をスケジューラーに取り込む
    importSchedules: protectedProcedure
      .input(z.object({ hours: z.number().min(1).max(168).default(24) }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await db.getDb();
        if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const settings = await db2.select().from(notionSettings)
          .where(eq(notionSettings.userId, ctx.user.id)).limit(1);
        if (!settings.length || !settings[0].integrationToken || !settings[0].databaseId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Notion連携が未設定です。左メニューの「Notion連携」から設定してください。" });
        }

        const sinceDate = new Date();
        sinceDate.setHours(sinceDate.getHours() - input.hours);

        const changes = await fetchNotionChanges(
          settings[0].integrationToken,
          settings[0].databaseId,
          sinceDate
        );

        // 予約日時が設定されているページのみスケジューラーに登録
        const scheduledChanges = changes.filter(c => c.scheduledAt);
        const importedIds: number[] = [];

        for (const change of scheduledChanges) {
          const companyName = change.companyName === "ハゼモト建設" ? "ハゼモト建設" : "クリニックアーキプロ";
          const scheduleId = await createScheduleFromNotion({
            userId: ctx.user.id,
            notionPageId: change.pageId,
            companyName,
            scheduledAt: change.scheduledAt!,
            platform: change.platform ?? "instagram",
            postText: change.postText ?? "",
            hashtags: change.hashtags ?? "",
          });
          importedIds.push(scheduleId);
        }

        // オーナーに通知
        if (importedIds.length > 0) {
          await notifyOwner({
            title: `Notionから${importedIds.length}件の投稿をスケジュールに登録しました`,
            content: `Notionの予約日時が設定された${importedIds.length}件の投稿を自動的にスケジューラーに登録しました。`,
          });
        }

        return {
          importedCount: importedIds.length,
          totalChanges: changes.length,
          scheduleIds: importedIds,
        };
      }),

    // Notion連携済みスケジュール一覧を取得
    getSyncedSchedules: protectedProcedure
      .query(async ({ ctx }) => {
        const schedules = await getNotionSyncedSchedules(ctx.user.id);
        return schedules.map(s => ({
          id: s.id,
          companyName: s.companyName,
          scheduledAt: s.scheduledAt?.toISOString() ?? null,
          status: s.status,
          notionPageId: s.notionPageId,
          notionSyncedAt: s.notionSyncedAt?.toISOString() ?? null,
        }));
      }),
  }),
  supervisor: router({
    // 支援員向け：全利用者の今日の進捗を取得
    getUsersProgressToday: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセスできます" });
        }
        return await db.getAllUsersProgressToday();
      }),
    // 支援員向け：特定利用者にフィードバックを送信
    sendFeedback: protectedProcedure
      .input(z.object({
        targetUserId: z.number(),
        message: z.string().min(1).max(500),
        feedbackType: z.enum(["praise", "suggestion", "correction"]).default("suggestion"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "管理者のみアクセスできます" });
        }
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { userFeedback } = await import("../drizzle/schema");
        await dbConn.insert(userFeedback).values({
          userId: input.targetUserId,
          supervisorId: ctx.user.id,
          message: input.message,
          feedbackType: input.feedbackType,
        });
        return { success: true };
      }),
  }),

  // 社長コラム（写真なし・テキストのみの投稿）
  presidentColumn: router({
    // 社長の想い・考えからAI投稿文を生成
    generate: protectedProcedure
      .input(z.object({
        topic: z.string().min(1).max(500),
        columnType: z.enum([
          "philosophy",   // 家づくりの哲学
          "local",        // 北九州への感謝・地域感
          "daily",        // 日常の気づき
          "craftsman",    // 職人への敬意
          "customer",     // お客様とのエピソード
          "challenge",    // 山ったこと・挑戦
        ]),
        platform: z.enum(["instagram", "x", "threads"]).default("instagram"),
      }))
      .mutation(async ({ input }) => {
        const columnTypeLabels: Record<string, string> = {
          philosophy: "家づくりの哲学・コダワリ",
          local: "北九州への感謝・地域感",
          daily: "日常の気づき・小さな発見",
          craftsman: "職人への敬意・現場の話",
          customer: "お客様とのエピソード",
          challenge: "山ったこと・挑戦の記録",
        };

        const platformGuidelines: Record<string, { length: string; hashtagCount: string }> = {
          instagram: { length: "200ー300文字程度", hashtagCount: "20ー30個" },
          x: { length: "100ー140文字程度", hashtagCount: "3ー5個" },
          threads: { length: "150ー250文字程度", hashtagCount: "5ー10個" },
        };

        const guide = platformGuidelines[input.platform];

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `あなたはハゼモト建設株式会社の社長、橨本健一（はぜもと けんいち）です。
昇和39年生まれ、明治大学建築学科卒。北九州で生まれ、北九州で育った。
一級建築士、一級建築施工管理技士。「地元で生まれ地元で育った北九州の工務店」を誇りに思っている。

話し方の特徴：
- 「『あのな、』「今日な、」「実はさ、」「これなんですよ、」」など、語りかけるような一人称で書く
- 建築の話を、人生や地域と結びつけて語る
- 小難しい技術的な話も、ゆっくりと分かりやすく話す
- 最後は必ず「ハゼモト建設 社長 橨本」と署名する
- 投稿の最後に改行してハッシュタグを付ける`,
            },
            {
              role: "user",
              content: `以下のテーマで、${input.platform}向けの「社長コラム」投稿文を作成してください。

コラムの種類：${columnTypeLabels[input.columnType]}
テーマ：${input.topic}

ガイドライン：
- 文字数：${guide.length}
- ハッシュタグ：${guide.hashtagCount}
- 写真なしのテキストのみの投稿なので、言葉だけで心を動かす内容にする
- 社長の個人的な体験や想いを盛り込む

${input.platform === "instagram" ? `推奨ハッシュタグ（以下から適切なものを選択）：
#ハゼモト建設 #北九州工務店 #社長の話 #家づくり #注文住宅 #北九州新築 #工務店北九州 #北九州市 #地元工務店 #建築士 #一級建築士 #北九州家づくり #ハゼモト建設株式会社 #北九州リフォーム #マイホーム北九州 #北九州一戸建て #北九州子育て #北九州地域活務 #北九州地元企業 #北九州職人 #北九州建築 #北九州設計 #北九州施工 #北九州住宅 #北九州暗らし #北九州インテリア #北九州山ったこと #北九州学び #北九州文化 #北九州歴史` : ""}

投稿文とハッシュタグを生成してください。`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "column_post",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  postText: {
                    type: "string",
                    description: "投稿文本文（ハッシュタグを含む）",
                  },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    description: "ハッシュタグのリスト（#を含む）",
                  },
                  charCount: {
                    type: "number",
                    description: "投稿文の文字数",
                  },
                },
                required: ["postText", "hashtags", "charCount"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "生成に失敗しました" });
        }
         return JSON.parse(content) as { postText: string; hashtags: string[]; charCount: number };
      }),
  }),

  // ワンクリック投稿文修正ルーター
  refinePost: router({
    refine: protectedProcedure
      .input(z.object({
        originalText: z.string(),
        platform: z.enum(["instagram", "x", "threads"]),
        refineType: z.enum(["shorter", "president_style", "more_hashtags", "casual", "formal"]),
        companyName: z.string().default("\u30cf\u30bc\u30e2\u30c8\u5efa\u8a2d"),
      }))
      .mutation(async ({ input }) => {
        const refineInstructions: Record<string, string> = {
          shorter: "\u6295\u7a3f\u6587\u3092\u73fe\u5728\u306e60%\u4ee5\u4e0b\u306e\u6587\u5b57\u6570\u306b\u5c0f\u3055\u304f\u307e\u3068\u3081\u3066\u304f\u3060\u3055\u3044\u3002\u8981\u70b9\u3068\u4eba\u306e\u6c17\u914d\u306f\u6b8b\u3057\u3001\u4e0d\u8981\u306a\u8aac\u660e\u3092\u524a\u3063\u3066\u3001\u30b3\u30f3\u30d1\u30af\u30c8\u306b\u3002",
          president_style: "\u793e\u9577\u30fb\u6a68\u672c\u5065\u4e00\u306e\u4e00\u4eba\u79f0\u30b9\u30bf\u30a4\u30eb\u306b\u66f8\u304d\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u300c\u4eca\u65e5\u306d\u3001\u73fe\u5834\u3067\u3053\u3093\u306a\u3053\u3068\u304c\u3042\u3063\u3066\u300d\u300c\u3046\u3061\u3067\u306f\u300d\u300c\u6b63\u76f4\u306b\u8a00\u3046\u3068\u300d\u306a\u3069\u3001\u793e\u9577\u306e\u80c3\u306e\u8a00\u8449\u3067\u3002\u660e\u308b\u304f\u3001\u30e6\u30fc\u30e2\u30a2\u304c\u3042\u308a\u3001\u4eba\u306e\u6c17\u914d\u304c\u611f\u3058\u3089\u308c\u308b\u6587\u4f53\u306b\u3002",
          more_hashtags: "\u30cf\u30c3\u30b7\u30e5\u30bf\u30b0\u3092\u5897\u3084\u3057\u3066\u304f\u3060\u3055\u3044\u3002Instagram\u306f20\uff5e30\u500b\u3001X\u306f3\uff5e5\u500b\u3001Threads\u306f8\uff5e12\u500b\u3092\u76ee\u5b89\u306b\u3002\u5927\u898f\u6a21\u30bf\u30b0\uff08\u6ce8\u6587\u4f4f\u5b85\u7b49\uff09\u30fb\u4e2d\u898f\u6a21\u30bf\u30b0\uff08\u5317\u4e5d\u5dde\u5de5\u52d9\u5e97\u7b49\uff09\u30fb\u5c0f\u898f\u6a21\u30bf\u30b0\uff08\u30cf\u30bc\u30e2\u30c8\u5efa\u8a2d\u7b49\uff09\u3092\u30d0\u30e9\u30f3\u30b9\u3088\u304f\u3002",
          casual: "\u3082\u3063\u3068\u30ab\u30b8\u30e5\u30a2\u30eb\u3067\u89aa\u3057\u307f\u3084\u3059\u3044\u6587\u4f53\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8fd1\u6240\u306e\u304a\u3058\u3055\u3093\u306b\u8a71\u3059\u3088\u3046\u306a\u6e29\u304b\u3044\u30c8\u30fc\u30f3\u3067\u3002",
          formal: "\u3082\u3063\u3068\u4e01\u5be7\u3067\u4fe1\u983c\u6027\u306e\u9ad8\u3044\u6587\u4f53\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u30d7\u30ed\u3089\u3057\u3055\u3068\u6e29\u304b\u307f\u3092\u4e21\u7acb\u3055\u305b\u3001\u304a\u5ba2\u69d8\u306b\u5b89\u5fc3\u611f\u3092\u4e0e\u3048\u308b\u6587\u4f53\u306b\u3002",
        };

        const platformLimits: Record<string, number> = {
          instagram: 500,
          x: 280,
          threads: 500,
        };

        const instruction = refineInstructions[input.refineType];
        const maxLength = platformLimits[input.platform];

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `\u3042\u306a\u305f\u306f\u30cf\u30bc\u30e2\u30c8\u5efa\u8a2d\u306e\u793e\u9577\u30fb\u6a68\u672c\u5065\u4e00\u3067\u3059\u3002${input.platform}\u5411\u3051\u306e\u6295\u7a3f\u6587\u3092\u4fee\u6b63\u3059\u308b\u30a8\u30ad\u30b9\u30d1\u30fc\u30c8\u3067\u3059\u3002\u4fee\u6b63\u5f8c\u306e\u6295\u7a3f\u6587\u306f${maxLength}\u5b57\u4ee5\u5185\u306b\u53ce\u3081\u3066\u304f\u3060\u3055\u3044\u3002`,
            },
            {
              role: "user",
              content: `\u4ee5\u4e0b\u306e\u6295\u7a3f\u6587\u3092\u4fee\u6b63\u3057\u3066\u304f\u3060\u3055\u3044\u3002\n\n\u300c\u4fee\u6b63\u6307\u793a\u300d\n${instruction}\n\n\u300c\u5143\u306e\u6295\u7a3f\u6587\u300d\n${input.originalText}\n\n\u4fee\u6b63\u5f8c\u306e\u6295\u7a3f\u6587\u306e\u307f\u3092\u8fd4\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8aac\u660e\u3084\u30b3\u30e1\u30f3\u30c8\u306f\u4e0d\u8981\u3067\u3059\u3002`,
            },
          ],
        });

        const rawContent = response.choices[0].message.content;
        const refinedText = typeof rawContent === 'string' ? rawContent.trim() : input.originalText;
        return { refinedText };
      }),
  }),
});
export type AppRouter = typeof appRouter;
