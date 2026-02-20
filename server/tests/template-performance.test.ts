import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "../db";
import { getDb } from "../db";

describe("Template Performance Stats", () => {
  let testTemplateId: number;
  let testDataSourceId: number;
  let testUserId: number;

  beforeAll(async () => {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // テスト用ユーザーを作成
    await db.upsertUser({
      openId: "test-performance-user",
      name: "Test Performance User",
      email: "test-performance@example.com",
    });
    const user = await db.getUserByOpenId("test-performance-user");
    if (!user) throw new Error("Failed to create test user");
    testUserId = user.id;

    // テスト用テンプレートを作成
    const templateId = await db.createPostTemplate({
      userId: testUserId,
      name: "Performance Test Template",
      companyName: "ハゼモト建設",
      instagramCaption: "Test caption",
    });
    testTemplateId = Number(templateId);
    console.log("Created test template with ID:", testTemplateId);

    // テスト用データソースを作成
    await db.createDataSource({
      userId: testUserId,
      name: "Performance Test Data Source",
      provider: "google_photos",
    });
    const dataSources = await db.getDataSourcesByUserId(testUserId);
    testDataSourceId = dataSources[0].id;
    console.log("Created test data source with ID:", testDataSourceId);
  });

  afterAll(async () => {
    const database = await getDb();
    if (!database) return;

    // テストデータをクリーンアップ
    try {
      await database.execute(`DELETE FROM template_performance_stats WHERE templateId = ${testTemplateId}`);
      await database.execute(`DELETE FROM post_templates WHERE id = ${testTemplateId}`);
      await database.execute(`DELETE FROM data_sources WHERE id = ${testDataSourceId}`);
      await database.execute(`DELETE FROM users WHERE id = ${testUserId}`);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  it("should record a successful post generation", async () => {
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: true,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
    });

    expect(stats.length).toBeGreaterThan(0);
    const stat = stats[0];
    expect(stat.templateId).toBe(testTemplateId);
    expect(stat.dataSourceId).toBe(testDataSourceId);
    expect(stat.successCount).toBe(1);
    expect(stat.failureCount).toBe(0);
    expect(stat.totalAttempts).toBe(1);
  });

  it("should record a failed post generation", async () => {
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: false,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
    });

    const stat = stats[0];
    expect(stat.successCount).toBe(1); // 前のテストから
    expect(stat.failureCount).toBe(1);
    expect(stat.totalAttempts).toBe(2);
  });

  it("should aggregate multiple attempts on the same day", async () => {
    // 同じ日に複数回記録
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: true,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: true,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
    });

    const stat = stats[0];
    expect(stat.totalAttempts).toBe(4); // 前のテストから2回 + 今回2回
    expect(stat.successCount).toBe(3);
    expect(stat.failureCount).toBe(1);
  });

  it("should filter stats by platform", async () => {
    // 別のプラットフォームで記録
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: true,
      platform: "x",
      companyName: "ハゼモト建設",
    });

    const instagramStats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      platform: "instagram",
    });

    const xStats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      platform: "x",
    });

    expect(instagramStats.length).toBeGreaterThan(0);
    expect(xStats.length).toBeGreaterThan(0);
    expect(instagramStats[0].platform).toBe("instagram");
    expect(xStats[0].platform).toBe("x");
  });

  it("should filter stats by company name", async () => {
    // 別の会社名で記録
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      success: true,
      platform: "instagram",
      companyName: "クリニックアーキプロ",
    });

    const hazemoStats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      companyName: "ハゼモト建設",
    });

    const clinicStats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      companyName: "クリニックアーキプロ",
    });

    expect(hazemoStats.length).toBeGreaterThan(0);
    expect(clinicStats.length).toBeGreaterThan(0);
  });

  it("should filter stats by date range", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      startDate: yesterday,
      endDate: tomorrow,
    });

    expect(stats.length).toBeGreaterThan(0);
  });

  it("should return summary with aggregated data", async () => {
    const summary = await db.getTemplatePerformanceSummary();

    expect(summary.length).toBeGreaterThan(0);
    const testTemplateSummary = summary.find((s) => s.templateId === testTemplateId);
    expect(testTemplateSummary).toBeDefined();
    if (testTemplateSummary) {
      expect(Number(testTemplateSummary.totalAttempts)).toBeGreaterThan(0);
      expect(Number(testTemplateSummary.successCount)).toBeGreaterThan(0);
    }
  });

  it("should handle null dataSourceId", async () => {
    await db.recordTemplatePerformance({
      templateId: testTemplateId,
      dataSourceId: null,
      success: true,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
    });

    const nullDataSourceStat = stats.find((s) => s.dataSourceId === null);
    expect(nullDataSourceStat).toBeDefined();
  });

  it("should calculate success rate correctly", async () => {
    const stats = await db.getTemplatePerformanceStats({
      templateId: testTemplateId,
      dataSourceId: testDataSourceId,
      platform: "instagram",
      companyName: "ハゼモト建設",
    });

    if (stats.length > 0) {
      const stat = stats[0];
      const successRate = (stat.successCount / stat.totalAttempts) * 100;
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    }
  });

  it("should handle multiple data sources for the same template", async () => {
    // 別のデータソースを作成
    await db.createDataSource({
      userId: testUserId,
      name: "Second Data Source",
      provider: "dropbox",
    });
    const dataSources = await db.getDataSourcesByUserId(testUserId);
    const secondDataSourceId = dataSources.find((ds) => ds.name === "Second Data Source")?.id;

    if (secondDataSourceId) {
      await db.recordTemplatePerformance({
        templateId: testTemplateId,
        dataSourceId: secondDataSourceId,
        success: true,
        platform: "instagram",
        companyName: "ハゼモト建設",
      });

      const stats = await db.getTemplatePerformanceStats({
        templateId: testTemplateId,
      });

      const uniqueDataSources = new Set(stats.map((s) => s.dataSourceId));
      expect(uniqueDataSources.size).toBeGreaterThanOrEqual(2);
    }
  });
});
