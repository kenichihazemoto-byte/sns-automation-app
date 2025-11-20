import { describe, it, expect } from 'vitest';
import { generatePostContent, generateIndividualComment, generateCarouselPost, ImageAnalysisResult } from './ai-service';

describe('AI投稿文生成機能のテスト', () => {
  const mockImageAnalysis: ImageAnalysisResult = {
    category: "リビング",
    style: "モダン",
    description: "広々としたリビングルームで、大きな窓から自然光が差し込んでいます。",
    keywords: ["リビング", "自然光", "広々", "モダン", "家族"]
  };

  describe('generatePostContent - ライフスタイル提案型文章生成', () => {
    it('ハゼモト建設向けにライフスタイル提案を含む投稿文を生成する', async () => {
      const result = await generatePostContent({
        platform: "instagram",
        imageAnalysis: mockImageAnalysis,
        companyName: "ハゼモト建設"
      });

      // 投稿文が生成されていることを確認
      expect(result.caption).toBeTruthy();
      expect(result.caption.length).toBeGreaterThan(50);
      
      // ハッシュタグが生成されていることを確認
      expect(result.hashtags).toBeTruthy();
      expect(result.hashtags.length).toBeGreaterThan(0);
      
      // 推奨ハッシュタグが含まれているか確認
      const recommendedHashtags = ["家づくり", "マイホーム計画", "理想の暮らし", "注文住宅"];
      const hasRecommendedHashtag = result.hashtags.some(tag => 
        recommendedHashtags.some(recommended => tag.includes(recommended))
      );
      expect(hasRecommendedHashtag).toBe(true);

      console.log('ハゼモト建設 - Instagram投稿文:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);

    it('クリニックアーキプロ向けにライフスタイル提案を含む投稿文を生成する', async () => {
      const clinicAnalysis: ImageAnalysisResult = {
        category: "待合室",
        style: "モダン",
        description: "清潔感のある待合室で、患者様がリラックスできる空間です。",
        keywords: ["待合室", "清潔感", "リラックス", "モダン", "患者様"]
      };

      const result = await generatePostContent({
        platform: "instagram",
        imageAnalysis: clinicAnalysis,
        companyName: "クリニックアーキプロ"
      });

      expect(result.caption).toBeTruthy();
      expect(result.caption.length).toBeGreaterThan(50);
      expect(result.hashtags).toBeTruthy();
      expect(result.hashtags.length).toBeGreaterThan(0);

      // 推奨ハッシュタグが含まれているか確認
      const recommendedHashtags = ["患者様体験", "医療環境", "クリニック設計"];
      const hasRecommendedHashtag = result.hashtags.some(tag => 
        recommendedHashtags.some(recommended => tag.includes(recommended))
      );
      expect(hasRecommendedHashtag).toBe(true);

      console.log('クリニックアーキプロ - Instagram投稿文:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);
  });

  describe('generateIndividualComment - 個別コメント生成', () => {
    it('個別写真のライフスタイル提案コメントを生成する', async () => {
      const result = await generateIndividualComment(
        mockImageAnalysis,
        "ハゼモト建設",
        "instagram"
      );

      expect(result.caption).toBeTruthy();
      expect(result.caption.length).toBeGreaterThan(30);
      expect(result.hashtags).toBeTruthy();
      expect(result.hashtags.length).toBeGreaterThan(3);

      console.log('個別コメント:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);
  });

  describe('generateCarouselPost - カルーセル投稿生成', () => {
    it('複数写真のストーリー仕立て投稿文を生成する', async () => {
      const multipleAnalyses: ImageAnalysisResult[] = [
        {
          category: "外観",
          style: "モダン",
          description: "シンプルで洗練された外観デザイン",
          keywords: ["外観", "モダン", "シンプル"]
        },
        {
          category: "リビング",
          style: "ナチュラル",
          description: "木の温もりを感じるリビング空間",
          keywords: ["リビング", "木材", "温もり"]
        },
        {
          category: "キッチン",
          style: "モダン",
          description: "使いやすさを追求したキッチン",
          keywords: ["キッチン", "機能的", "使いやすい"]
        }
      ];

      const result = await generateCarouselPost(
        multipleAnalyses,
        "ハゼモト建設",
        "instagram"
      );

      expect(result.caption).toBeTruthy();
      expect(result.caption.length).toBeGreaterThan(100);
      expect(result.hashtags).toBeTruthy();
      expect(result.hashtags.length).toBeGreaterThan(10);

      console.log('カルーセル投稿:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);
  });

  describe('プラットフォーム別の文章生成', () => {
    it('X (Twitter)向けに短い投稿文を生成する', async () => {
      const result = await generatePostContent({
        platform: "x",
        imageAnalysis: mockImageAnalysis,
        companyName: "ハゼモト建設"
      });

      expect(result.caption).toBeTruthy();
      // Xは短めの文章（100-150文字程度）
      expect(result.caption.length).toBeLessThan(200);
      // ハッシュタグは少なめ（3-5個）
      expect(result.hashtags.length).toBeLessThan(8);

      console.log('X投稿文:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);

    it('Threads向けに親しみやすい投稿文を生成する', async () => {
      const result = await generatePostContent({
        platform: "threads",
        imageAnalysis: mockImageAnalysis,
        companyName: "ハゼモト建設"
      });

      expect(result.caption).toBeTruthy();
      // Threadsは中程度の文章（150-200文字程度）
      expect(result.caption.length).toBeGreaterThan(50);
      expect(result.caption.length).toBeLessThan(300);
      // ハッシュタグは適度（5-10個）
      expect(result.hashtags.length).toBeGreaterThan(3);
      expect(result.hashtags.length).toBeLessThan(15);

      console.log('Threads投稿文:');
      console.log('本文:', result.caption);
      console.log('ハッシュタグ:', result.hashtags.join(', '));
    }, 60000);
  });
});
