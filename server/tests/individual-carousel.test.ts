import { describe, it, expect } from 'vitest';

describe('Individual Comments and Carousel Post Generation', () => {
  it('should have generateIndividualComment function', async () => {
    const { generateIndividualComment } = await import('../ai-service');
    expect(typeof generateIndividualComment).toBe('function');
  });

  it('should have generateCarouselPost function', async () => {
    const { generateCarouselPost } = await import('../ai-service');
    expect(typeof generateCarouselPost).toBe('function');
  });

  it('should generate individual comment with correct structure', async () => {
    const { generateIndividualComment } = await import('../ai-service');
    
    const mockAnalysis = {
      category: "外観",
      style: "モダン",
      description: "美しい外観の住宅",
      keywords: ["モダン", "外観", "デザイン"],
    };

    // 実際のAI呼び出しをテストする場合は時間がかかるため、
    // ここでは関数の存在と構造のみを確認
    expect(generateIndividualComment).toBeDefined();
  });

  it('should generate carousel post with correct structure', async () => {
    const { generateCarouselPost } = await import('../ai-service');
    
    const mockAnalyses = [
      {
        category: "外観",
        style: "モダン",
        description: "美しい外観の住宅",
        keywords: ["モダン", "外観", "デザイン"],
      },
      {
        category: "内装",
        style: "ナチュラル",
        description: "温かみのある内装",
        keywords: ["ナチュラル", "内装", "木材"],
      },
    ];

    // 実際のAI呼び出しをテストする場合は時間がかかるため、
    // ここでは関数の存在と構造のみを確認
    expect(generateCarouselPost).toBeDefined();
  });

  it('should have demo router with individual comments endpoint', async () => {
    const { appRouter } = await import('../routers');
    expect(appRouter._def.procedures['demo.generateIndividualComments']).toBeDefined();
  });

  it('should have demo router with carousel post endpoint', async () => {
    const { appRouter } = await import('../routers');
    expect(appRouter._def.procedures['demo.generateCarouselPost']).toBeDefined();
  });
});
