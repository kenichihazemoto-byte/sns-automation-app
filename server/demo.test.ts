import { describe, it, expect } from 'vitest';
import * as aiService from '../server/ai-service';
import * as googlePhotosService from '../server/google-photos-service';

describe('Demo機能のテスト', () => {
  it('Google フォトアルバムリストが正しく定義されている', () => {
    expect(googlePhotosService.HAZEMOTO_ALBUMS).toBeDefined();
    expect(googlePhotosService.HAZEMOTO_ALBUMS.length).toBeGreaterThan(0);
    expect(googlePhotosService.HAZEMOTO_ALBUMS[0]).toHaveProperty('url');
    expect(googlePhotosService.HAZEMOTO_ALBUMS[0]).toHaveProperty('year');
    expect(googlePhotosService.HAZEMOTO_ALBUMS[0]).toHaveProperty('title');
  });

  it('ランダムアルバム選択が動作する', () => {
    const album = googlePhotosService.selectRandomAlbum();
    expect(album).toBeDefined();
    expect(album.url).toBeTruthy();
    expect(album.year).toBeTruthy();
  });

  it('ランダム写真取得が動作する', async () => {
    const result = await googlePhotosService.getRandomConstructionPhoto();
    expect(result).toBeDefined();
    expect(result.photo).toBeDefined();
    expect(result.album).toBeDefined();
    expect(result.photo.url).toBeTruthy();
  });

  it('AI画像分析が正しい形式を返す', async () => {
    // デモ用のサンプル画像URL
    const sampleImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800";
    
    const analysis = await aiService.analyzeImage(sampleImageUrl);
    
    expect(analysis).toBeDefined();
    expect(analysis.category).toBeTruthy();
    expect(analysis.style).toBeTruthy();
    expect(analysis.description).toBeTruthy();
    expect(Array.isArray(analysis.keywords)).toBe(true);
    expect(analysis.keywords.length).toBeGreaterThan(0);
  }, 30000); // AI処理は時間がかかるので30秒のタイムアウト

  it('AI投稿文生成が各プラットフォームで動作する', async () => {
    const sampleAnalysis: aiService.ImageAnalysisResult = {
      category: "外観",
      style: "モダン",
      description: "美しい現代建築の外観",
      keywords: ["建築", "デザイン", "モダン", "外観", "住宅"],
    };

    // Instagram
    const instagramContent = await aiService.generatePostContent({
      platform: "instagram",
      imageAnalysis: sampleAnalysis,
      companyName: "ハゼモト建設",
    });
    expect(instagramContent.caption).toBeTruthy();
    expect(Array.isArray(instagramContent.hashtags)).toBe(true);
    expect(instagramContent.hashtags.length).toBeGreaterThan(10); // Instagramは多めのハッシュタグ

    // X (Twitter)
    const xContent = await aiService.generatePostContent({
      platform: "x",
      imageAnalysis: sampleAnalysis,
      companyName: "ハゼモト建設",
    });
    expect(xContent.caption).toBeTruthy();
    expect(Array.isArray(xContent.hashtags)).toBe(true);
    expect(xContent.hashtags.length).toBeLessThan(10); // Xは少なめのハッシュタグ

    // Threads
    const threadsContent = await aiService.generatePostContent({
      platform: "threads",
      imageAnalysis: sampleAnalysis,
      companyName: "ハゼモト建設",
    });
    expect(threadsContent.caption).toBeTruthy();
    expect(Array.isArray(threadsContent.hashtags)).toBe(true);
  }, 60000); // AI処理は時間がかかるので60秒のタイムアウト
});
