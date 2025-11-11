import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as aiService from "./ai-service";

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

  // SNS Account Management
  snsAccounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSnsAccountsByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
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
        imageId: z.number(),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createPostSchedule({
          userId: ctx.user.id,
          ...input,
        });
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
});

export type AppRouter = typeof appRouter;
