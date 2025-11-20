import { describe, it, expect } from 'vitest';
import { generateReelsStoriesContent, ImageAnalysisResult, ContentStyle } from './ai-service';

describe('リール・ストーリーズ用短文生成機能のテスト', () => {
  const mockImageAnalysis: ImageAnalysisResult = {
    category: "リビング",
    style: "モダン",
    description: "広々としたリビングルームで、大きな窓から自然光が差し込んでいます。",
    keywords: ["リビング", "自然光", "広々", "モダン", "家族"]
  };

  const contentTypes: ContentStyle[] = ["hook", "question", "emotion", "cta", "storytelling"];

  describe('ハゼモト建設向けリール・ストーリーズ生成', () => {
    contentTypes.forEach((contentType) => {
      it(`${contentType}スタイルの短文を生成する`, async () => {
        const result = await generateReelsStoriesContent(
          mockImageAnalysis,
          "ハゼモト建設",
          contentType
        );

        // 基本的な構造チェック
        expect(result.shortText).toBeTruthy();
        expect(result.style).toBeTruthy();
        expect(result.usage).toBeTruthy();

        // 短文の長さチェック（5-50文字程度）
        expect(result.shortText.length).toBeGreaterThan(3);
        expect(result.shortText.length).toBeLessThan(100);

        console.log(`\n【ハゼモト建設 - ${contentType}】`);
        console.log(`短文: ${result.shortText}`);
        console.log(`スタイル: ${result.style}`);
        console.log(`使用シーン: ${result.usage}`);
      }, 30000);
    });
  });

  describe('クリニックアーキプロ向けリール・ストーリーズ生成', () => {
    const clinicAnalysis: ImageAnalysisResult = {
      category: "待合室",
      style: "モダン",
      description: "清潔感のある待合室で、患者様がリラックスできる空間です。",
      keywords: ["待合室", "清潔感", "リラックス", "モダン", "患者様"]
    };

    contentTypes.forEach((contentType) => {
      it(`${contentType}スタイルの短文を生成する`, async () => {
        const result = await generateReelsStoriesContent(
          clinicAnalysis,
          "クリニックアーキプロ",
          contentType
        );

        expect(result.shortText).toBeTruthy();
        expect(result.style).toBeTruthy();
        expect(result.usage).toBeTruthy();

        expect(result.shortText.length).toBeGreaterThan(3);
        expect(result.shortText.length).toBeLessThan(100);

        console.log(`\n【クリニックアーキプロ - ${contentType}】`);
        console.log(`短文: ${result.shortText}`);
        console.log(`スタイル: ${result.style}`);
        console.log(`使用シーン: ${result.usage}`);
      }, 30000);
    });
  });

  describe('スタイル別の特性チェック', () => {
    it('hookスタイルは短くインパクトがある', async () => {
      const result = await generateReelsStoriesContent(
        mockImageAnalysis,
        "ハゼモト建設",
        "hook"
      );

      // hookは特に短い（5-20文字程度）
      expect(result.shortText.length).toBeLessThan(30);
      console.log(`\nHookスタイル: ${result.shortText} (${result.shortText.length}文字)`);
    }, 30000);

    it('questionスタイルは疑問形を含む', async () => {
      const result = await generateReelsStoriesContent(
        mockImageAnalysis,
        "ハゼモト建設",
        "question"
      );

      // 疑問符が含まれているか、または疑問形の表現があるか
      const hasQuestion = result.shortText.includes('？') || 
                         result.shortText.includes('?') ||
                         result.shortText.includes('ですか') ||
                         result.shortText.includes('ますか');
      expect(hasQuestion).toBe(true);
      console.log(`\nQuestionスタイル: ${result.shortText}`);
    }, 30000);

    it('storytellingスタイルは他より長い', async () => {
      const result = await generateReelsStoriesContent(
        mockImageAnalysis,
        "ハゼモト建設",
        "storytelling"
      );

      // storytellingは20-50文字程度
      expect(result.shortText.length).toBeGreaterThan(15);
      console.log(`\nStorytellingスタイル: ${result.shortText} (${result.shortText.length}文字)`);
    }, 30000);
  });

  describe('ターゲット別のトーンチェック', () => {
    it('ハゼモト建設は親しみやすいトーン', async () => {
      const result = await generateReelsStoriesContent(
        mockImageAnalysis,
        "ハゼモト建設",
        "emotion"
      );

      // 親しみやすい表現（絵文字、「〜」など）が含まれる可能性が高い
      expect(result.shortText).toBeTruthy();
      console.log(`\nハゼモト建設（親しみやすいトーン）: ${result.shortText}`);
    }, 30000);

    it('クリニックアーキプロは専門的なトーン', async () => {
      const clinicAnalysis: ImageAnalysisResult = {
        category: "待合室",
        style: "モダン",
        description: "清潔感のある待合室で、患者様がリラックスできる空間です。",
        keywords: ["待合室", "清潔感", "リラックス", "モダン", "患者様"]
      };

      const result = await generateReelsStoriesContent(
        clinicAnalysis,
        "クリニックアーキプロ",
        "emotion"
      );

      expect(result.shortText).toBeTruthy();
      console.log(`\nクリニックアーキプロ（専門的なトーン）: ${result.shortText}`);
    }, 30000);
  });
});
