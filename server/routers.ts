import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as aiService from "./ai-service";
import { storagePut } from "./storage";
import { analyzeImage } from "./ai-service";

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
        platform: z.enum(["instagram", "x", "threads"]),
        accountName: z.string(),
        companyName: z.enum(['ハゼモト建設', 'クリニックアーキプロ']),
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
        companyName: z.enum(['ハゼモト建設', 'クリニックアーキプロ']),
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
        status: z.enum(["draft", "scheduled", "active", "pending", "processing", "completed", "failed", "cancelled"]),
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
    // Google フォトアルバム一覧を取得
    getPhotoAlbums: protectedProcedure
      .query(async () => {
        const googlePhotos = await import("./google-photos-service");
        return googlePhotos.HAZEMOTO_ALBUMS;
      }),

    // 指定したアルバムから写真一覧を取得
    getPhotosFromAlbum: protectedProcedure
      .input(z.object({
        albumUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const googlePhotos = await import("./google-photos-service");
        const photos = await googlePhotos.fetchPhotosFromAlbum(input.albumUrl);
        return photos;
      }),

    // 選択した写真をAI分析
    analyzeSelectedPhoto: protectedProcedure
      .input(z.object({
        photoUrl: z.string(),
        companyName: z.enum(['ハゼモト建設', 'クリニックアーキプロ']),
      }))
      .mutation(async ({ input }) => {
        // デモ用のサンプル画像URLを使用してAI分析
        const sampleImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800";
        const analysis = await aiService.analyzeImage(sampleImageUrl);
        
        return {
          photo: { url: input.photoUrl },
          analysis,
        };
      }),

    // ランダムな竣工写真を取得してAI分析
    getRandomPhotoWithAnalysis: protectedProcedure
      .mutation(async () => {
        const googlePhotos = await import("./google-photos-service");
        const { photo, album } = await googlePhotos.getRandomConstructionPhoto();
        
        // デモ用のサンプル画像URLを使用してAI分析
        // 実際の実装では、photo.urlを使用
        const sampleImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800";
        
        const analysis = await aiService.analyzeImage(sampleImageUrl);
        
        return {
          photo,
          album,
          analysis,
        };
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
      }))
      .mutation(async ({ input }) => {
        const platforms = ["instagram", "x", "threads"] as const;
        const contents: any = {};

        for (const platform of platforms) {
          contents[platform] = await aiService.generatePostContent({
            platform,
            imageAnalysis: input.imageAnalysis,
            companyName: input.companyName,
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
          cloudStorageConfigId: 1, // TODO: 実際のconfig IDを使用
          originalUrl: input.imageUrl,
          fileName: `google-photos-${Date.now()}.jpg`,
          analysisResult: JSON.stringify(input.imageAnalysis),
          imageCategory: input.imageAnalysis.category,
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
        const { generateCarouselPost } = await import("./ai-service");
        
        const carouselPost = await generateCarouselPost(
          input.imageAnalyses,
          input.companyName,
          input.platform
        );

        return carouselPost;
      }),

    // リール・ストーリーズ用短文を生成
    generateReelsStories: protectedProcedure
      .input(z.object({
        companyName: z.enum(["ハゼモト建設", "クリニックアーキプロ"]),
        contentType: z.enum(["hook", "question", "emotion", "cta", "storytelling"]),
        imageAnalysis: z.object({
          category: z.string(),
          style: z.string(),
          description: z.string(),
          keywords: z.array(z.string()),
        }),
      }))
      .mutation(async ({ input }) => {
        const { generateReelsStoriesContent } = await import("./ai-service");
        
        const reelsContent = await generateReelsStoriesContent(
          input.imageAnalysis,
          input.companyName,
          input.contentType
        );

        return reelsContent;
      }),

    // 複数写真を取得して分析
    getMultiplePhotosWithAnalysis: protectedProcedure
      .input(z.object({
        count: z.number().min(2).max(10).default(5),
      }))
      .mutation(async ({ input }) => {
        const googlePhotos = await import("./google-photos-service");
        const photos = [];

        for (let i = 0; i < input.count; i++) {
          const { photo, album } = await googlePhotos.getRandomConstructionPhoto();
          const sampleImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800";
          const analysis = await aiService.analyzeImage(sampleImageUrl);
          
          photos.push({
            photo,
            album,
            analysis,
            score: Math.random() * 100, // 仮のスコア（実際はAIが評価）
          });
        }

        // スコアでソート
        photos.sort((a, b) => b.score - a.score);

        return photos;
      }),
  }),
});

export type AppRouter = typeof appRouter;
