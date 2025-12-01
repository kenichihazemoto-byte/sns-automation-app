import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";

describe("Analytics and Optimal Timing Features", () => {
  let testUserId: number;
  let testPostHistoryId: number;

  beforeAll(async () => {
    // Create a test user
    const testUser = {
      openId: "test-analytics-user-" + Date.now(),
      name: "Analytics Test User",
      email: "analytics@test.com",
      loginMethod: "test",
      role: "user" as const,
    };
    await db.upsertUser(testUser);
    const user = await db.getUserByOpenId(testUser.openId);
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // Create a test post schedule first
    const scheduleId = await db.createPostSchedule({
      userId: testUserId,
      scheduledAt: new Date(),
      status: "completed",
    });

    // Create a test post content
    const contentId = await db.createPostContent({
      postScheduleId: scheduleId,
      platform: "instagram",
      caption: "Test post for analytics",
    });

    // Create a test post history
    const history = await db.createPostHistory({
      postScheduleId: scheduleId,
      postContentId: contentId,
      platform: "instagram",
      status: "published",
      publishedAt: new Date(),
    });
    testPostHistoryId = history.id;
  });

  afterAll(async () => {
    // Cleanup is handled by database constraints
  });

  describe("Engagement Tracking", () => {
    it("should record engagement data with engagement rate calculation", async () => {
      const engagementData = {
        postHistoryId: testPostHistoryId,
        likes: 100,
        comments: 20,
        shares: 10,
        views: 1000,
        hourOfDay: 14,
        dayOfWeek: 3,
      };

      const analyticsId = await db.upsertAnalytics(engagementData);
      expect(analyticsId).toBeGreaterThan(0);

      // Verify the data was saved
      const analytics = await db.getAnalyticsByPostHistoryId(testPostHistoryId);
      expect(analytics).toBeDefined();
      expect(analytics?.likes).toBe(100);
      expect(analytics?.comments).toBe(20);
      expect(analytics?.shares).toBe(10);
      expect(analytics?.views).toBe(1000);
      expect(analytics?.hourOfDay).toBe(14);
      expect(analytics?.dayOfWeek).toBe(3);
      
      // Engagement rate = (likes + comments + shares) / views * 10000
      // (100 + 20 + 10) / 1000 * 10000 = 1300
      expect(analytics?.engagementRate).toBe(1300);
    });

    it("should update existing analytics data", async () => {
      // Update with new data
      const updatedData = {
        postHistoryId: testPostHistoryId,
        likes: 150,
        comments: 30,
        shares: 15,
        views: 1500,
      };

      await db.upsertAnalytics(updatedData);

      const analytics = await db.getAnalyticsByPostHistoryId(testPostHistoryId);
      expect(analytics?.likes).toBe(150);
      expect(analytics?.comments).toBe(30);
      expect(analytics?.shares).toBe(15);
      expect(analytics?.views).toBe(1500);
      
      // New engagement rate = (150 + 30 + 15) / 1500 * 10000 = 1300
      expect(analytics?.engagementRate).toBe(1300);
    });
  });

  describe("Analytics Summary", () => {
    it("should get analytics summary for user", async () => {
      const summary = await db.getAnalyticsSummary(testUserId);
      
      expect(summary).toBeDefined();
      expect(summary.totalPosts).toBeGreaterThan(0);
      expect(summary.totalLikes).toBeGreaterThanOrEqual(0);
      expect(summary.totalComments).toBeGreaterThanOrEqual(0);
      expect(summary.totalShares).toBeGreaterThanOrEqual(0);
      expect(summary.totalViews).toBeGreaterThanOrEqual(0);
      expect(summary.avgEngagementRate).toBeGreaterThanOrEqual(0);
    });

    it("should get analytics by platform", async () => {
      const platformData = await db.getAnalyticsByPlatform(testUserId);
      
      expect(Array.isArray(platformData)).toBe(true);
      if (platformData.length > 0) {
        const firstPlatform = platformData[0];
        expect(firstPlatform).toHaveProperty("platform");
        expect(firstPlatform).toHaveProperty("totalPosts");
        expect(firstPlatform).toHaveProperty("totalLikes");
        expect(firstPlatform).toHaveProperty("avgEngagementRate");
      }
    });

    it("should get analytics by hour of day", async () => {
      const hourData = await db.getAnalyticsByHourOfDay(testUserId);
      
      expect(Array.isArray(hourData)).toBe(true);
      if (hourData.length > 0) {
        const firstHour = hourData[0];
        expect(firstHour).toHaveProperty("hourOfDay");
        expect(firstHour.hourOfDay).toBeGreaterThanOrEqual(0);
        expect(firstHour.hourOfDay).toBeLessThanOrEqual(23);
        expect(firstHour).toHaveProperty("totalPosts");
        expect(firstHour).toHaveProperty("avgEngagementRate");
      }
    });

    it("should get analytics by day of week", async () => {
      const dayData = await db.getAnalyticsByDayOfWeek(testUserId);
      
      expect(Array.isArray(dayData)).toBe(true);
      if (dayData.length > 0) {
        const firstDay = dayData[0];
        expect(firstDay).toHaveProperty("dayOfWeek");
        expect(firstDay.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(firstDay.dayOfWeek).toBeLessThanOrEqual(6);
        expect(firstDay).toHaveProperty("totalPosts");
        expect(firstDay).toHaveProperty("avgEngagementRate");
      }
    });
  });

  describe("Optimal Posting Time Suggestions", () => {
    it("should get optimal posting times based on historical data", async () => {
      const optimal = await db.getOptimalPostingTimes(testUserId);
      
      expect(optimal).toBeDefined();
      expect(optimal).toHaveProperty("bestHours");
      expect(optimal).toHaveProperty("bestDays");
      expect(optimal).toHaveProperty("recommendations");
      
      expect(Array.isArray(optimal.bestHours)).toBe(true);
      expect(Array.isArray(optimal.bestDays)).toBe(true);
      expect(Array.isArray(optimal.recommendations)).toBe(true);
      
      // If there's data, verify structure
      if (optimal.bestHours.length > 0) {
        const bestHour = optimal.bestHours[0];
        expect(bestHour).toHaveProperty("hour");
        expect(bestHour).toHaveProperty("score");
        expect(bestHour).toHaveProperty("avgEngagementRate");
        expect(bestHour).toHaveProperty("totalPosts");
      }
      
      if (optimal.bestDays.length > 0) {
        const bestDay = optimal.bestDays[0];
        expect(bestDay).toHaveProperty("day");
        expect(bestDay).toHaveProperty("score");
        expect(bestDay).toHaveProperty("avgEngagementRate");
        expect(bestDay).toHaveProperty("totalPosts");
      }
    });

    it("should suggest optimal posting time for new post", async () => {
      const suggestion = await db.suggestPostingTime(testUserId);
      
      expect(suggestion).toBeDefined();
      expect(suggestion).toHaveProperty("suggestedHour");
      expect(suggestion).toHaveProperty("suggestedDay");
      expect(suggestion).toHaveProperty("confidence");
      expect(suggestion).toHaveProperty("reason");
      
      expect(suggestion.suggestedHour).toBeGreaterThanOrEqual(0);
      expect(suggestion.suggestedHour).toBeLessThanOrEqual(23);
      expect(suggestion.suggestedDay).toBeGreaterThanOrEqual(0);
      expect(suggestion.suggestedDay).toBeLessThanOrEqual(6);
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(100);
      expect(typeof suggestion.reason).toBe("string");
    });

    it("should provide default suggestion when no data available", async () => {
      // Create a new user with no post history
      const newUser = {
        openId: "test-new-user-" + Date.now(),
        name: "New User",
        email: "new@test.com",
        loginMethod: "test",
        role: "user" as const,
      };
      await db.upsertUser(newUser);
      const user = await db.getUserByOpenId(newUser.openId);
      if (!user) throw new Error("Failed to create new user");

      const suggestion = await db.suggestPostingTime(user.id);
      
      expect(suggestion.suggestedHour).toBe(12); // Default noon
      expect(suggestion.suggestedDay).toBe(3); // Default Wednesday
      expect(suggestion.confidence).toBe(0);
      expect(suggestion.reason).toContain("デフォルト");
    });
  });

  describe("Photo Tagging", () => {
    it("should extract tags from analysis result", () => {
      const analysisResult = `
        この写真は建物の外観を撮影したものです。
        モダンな内装デザインが特徴的です。
        施工前と比較してビフォーアフターの変化が顕著です。
        リフォーム完成後の美しい仕上がりです。
      `;

      const tags = db.extractTagsFromAnalysis(analysisResult);
      
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      
      // Should extract relevant tags
      const possibleTags = ["外観", "内装", "ビフォーアフター", "リフォーム"];
      const hasRelevantTag = tags.some(tag => possibleTags.includes(tag));
      expect(hasRelevantTag).toBe(true);
    });

    it("should update tags for upload history", async () => {
      // Create test upload history
      const historyId = await db.createUploadHistory({
        userId: testUserId,
        companyName: "テスト会社",
        title: "テスト投稿",
        photoData: JSON.stringify([{ url: "test.jpg" }]),
        photoCount: 1,
        tags: null,
      });

      const tags = ["外観", "内装", "ビフォーアフター"];
      await db.updateUploadHistoryTags(historyId, tags);

      // Verify tags were saved
      const history = await db.getUploadHistoryByUserId(testUserId);
      const updatedHistory = history.find(h => h.id === historyId);
      
      expect(updatedHistory).toBeDefined();
      expect(updatedHistory?.tags).toBeDefined();
      
      if (updatedHistory?.tags) {
        const savedTags = JSON.parse(updatedHistory.tags);
        expect(Array.isArray(savedTags)).toBe(true);
        expect(savedTags).toEqual(tags);
      }
    });

    it("should search upload history by tags", async () => {
      // Create upload history with tags
      const historyId = await db.createUploadHistory({
        userId: testUserId,
        companyName: "テスト会社",
        title: "外観写真",
        photoData: JSON.stringify([{ url: "exterior.jpg" }]),
        photoCount: 1,
        tags: JSON.stringify(["外観", "新築"]),
      });

      // Search by tag
      const results = await db.searchUploadHistoryByTags(testUserId, ["外観"]);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      const foundHistory = results.find(h => h.id === historyId);
      expect(foundHistory).toBeDefined();
      expect(foundHistory?.title).toBe("外観写真");
    });
  });

  describe("tRPC API Integration", () => {
    it("should record engagement via API", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: "test", name: "Test", role: "user" },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.analytics.recordEngagement({
        postHistoryId: testPostHistoryId,
        likes: 200,
        comments: 40,
        shares: 20,
        views: 2000,
        hourOfDay: 18,
        dayOfWeek: 5,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it("should get analytics summary via API", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: "test", name: "Test", role: "user" },
        req: {} as any,
        res: {} as any,
      });

      const summary = await caller.analytics.getSummary();
      
      expect(summary).toBeDefined();
      expect(summary.totalPosts).toBeGreaterThan(0);
    });

    it("should get optimal times via API", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: "test", name: "Test", role: "user" },
        req: {} as any,
        res: {} as any,
      });

      const optimal = await caller.optimalTiming.getOptimalTimes();
      
      expect(optimal).toBeDefined();
      expect(optimal).toHaveProperty("bestHours");
      expect(optimal).toHaveProperty("bestDays");
      expect(optimal).toHaveProperty("recommendations");
    });

    it("should suggest posting time via API", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: "test", name: "Test", role: "user" },
        req: {} as any,
        res: {} as any,
      });

      const suggestion = await caller.optimalTiming.suggestTime();
      
      expect(suggestion).toBeDefined();
      expect(suggestion).toHaveProperty("suggestedHour");
      expect(suggestion).toHaveProperty("suggestedDay");
      expect(suggestion).toHaveProperty("confidence");
      expect(suggestion).toHaveProperty("reason");
    });

    it("should extract tags via API", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, openId: "test", name: "Test", role: "user" },
        req: {} as any,
        res: {} as any,
      });

      const tags = await caller.photoTags.extractTags({
        analysisResult: "外観写真です。内装もきれいです。",
      });
      
      expect(Array.isArray(tags)).toBe(true);
    });
  });
});
