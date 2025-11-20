import { invokeLLM } from "./_core/llm";

/**
 * AI画像分析サービス
 * OpenAI Vision APIを使用して画像の内容を分析
 */

export interface ImageAnalysisResult {
  category: string; // 例: "外観", "内装", "キッチン", "診察室"
  style: string; // 例: "モダン", "和風", "ミニマル"
  description: string; // 画像の詳細な説明
  keywords: string[]; // 抽出されたキーワード
}

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは建築・医療施設の写真を分析する専門家です。写真の内容を詳しく分析し、カテゴリー、スタイル、説明、キーワードを抽出してください。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "この画像を分析して、以下の情報を抽出してください：\n1. カテゴリー（外観、内装、キッチン、診察室、待合室など）\n2. デザインスタイル（モダン、和風、ミニマル、クラシックなど）\n3. 詳細な説明\n4. 関連するキーワード（5個程度）",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "画像のカテゴリー（外観、内装、キッチンなど）",
            },
            style: {
              type: "string",
              description: "デザインスタイル（モダン、和風など）",
            },
            description: {
              type: "string",
              description: "画像の詳細な説明",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "関連するキーワードのリスト",
            },
          },
          required: ["category", "style", "description", "keywords"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("AI analysis returned empty content");
  }

  return JSON.parse(content) as ImageAnalysisResult;
}

/**
 * SNS投稿コンテンツ生成サービス
 */

export interface PostContent {
  caption: string;
  hashtags: string[];
}

export interface GeneratePostContentParams {
  platform: "instagram" | "x" | "threads";
  imageAnalysis: ImageAnalysisResult;
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
}

export async function generatePostContent(
  params: GeneratePostContentParams
): Promise<PostContent> {
  const { platform, imageAnalysis, companyName } = params;

  // プラットフォームごとの特性を定義
  const platformGuidelines = {
    instagram: {
      style: "写真映えする魅力的な文章",
      length: "長め（200-300文字程度）",
      hashtagCount: "多め（15-20個）",
      tone: "親しみやすく、視覚的な表現を重視",
    },
    x: {
      style: "簡潔で要点をまとめた文章",
      length: "短め（100-150文字程度）",
      hashtagCount: "少なめ（3-5個）",
      tone: "シンプルで分かりやすく",
    },
    threads: {
      style: "親しみやすく会話的な文章",
      length: "中程度（150-200文字程度）",
      hashtagCount: "適度（5-10個）",
      tone: "フレンドリーで親近感のある",
    },
  };

  const guideline = platformGuidelines[platform];

  // ターゲット別の設定
  const targetAudience = companyName === "ハゼモト建設" 
    ? {
        name: "住宅購入検討者（一般ユーザー）",
        description: "マイホームを夢見る家族、住まいへのこだわりを持つ方、快適な生活空間を求める方",
        tone: "親しみやすく、共感を呼ぶ温かい表現。「家族」「夢」「安心」などのキーワードを使用",
        keywords: ["家族", "夢のマイホーム", "快適な暮らし", "安心", "住まい", "ライフスタイル"]
      }
    : {
        name: "医療関係者（医師、クリニック経営者）",
        description: "クリニック開業を考える医師、施設リニューアルを検討する経営者、患者体験向上を目指す医療プロフェッショナル",
        tone: "専門的で信頼感のある表現。「患者様」「医療環境」「機能性」などのキーワードを使用",
        keywords: ["患者様体験", "医療環境", "機能性", "クリニック設計", "プロフェッショナル", "信頼"]
      };

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `あなたは${companyName}のSNSマーケティング担当者です。

ターゲット: ${targetAudience.name}
ターゲットの詳細: ${targetAudience.description}
トーン: ${targetAudience.tone}
重要なキーワード: ${targetAudience.keywords.join(", ")}

ターゲットに響く魅力的な投稿を作成してください。`,
      },
      {
        role: "user",
        content: `以下の画像分析結果に基づいて、${platform}向けの投稿を作成してください。

画像分析結果:
- カテゴリー: ${imageAnalysis.category}
- スタイル: ${imageAnalysis.style}
- 説明: ${imageAnalysis.description}
- キーワード: ${imageAnalysis.keywords.join(", ")}

プラットフォーム: ${platform}
ガイドライン:
- スタイル: ${guideline.style}
- 文章の長さ: ${guideline.length}
- ハッシュタグ数: ${guideline.hashtagCount}
- トーン: ${guideline.tone}

投稿文とハッシュタグを生成してください。`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "post_content",
        strict: true,
        schema: {
          type: "object",
          properties: {
            caption: {
              type: "string",
              description: "投稿の本文（ハッシュタグを含まない）",
            },
            hashtags: {
              type: "array",
              items: { type: "string" },
              description: "ハッシュタグのリスト（#を含まない）",
            },
          },
          required: ["caption", "hashtags"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("AI content generation returned empty content");
  }

  return JSON.parse(content) as PostContent;
}

/**
 * コメント自動返信生成サービス
 */

export interface GenerateReplyParams {
  commentContent: string;
  postContext: string;
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
}

export async function generateCommentReply(
  params: GenerateReplyParams
): Promise<string> {
  const { commentContent, postContext, companyName } = params;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `あなたは${companyName}のカスタマーサポート担当者です。SNSのコメントに対して、親切で丁寧な返信を作成してください。`,
      },
      {
        role: "user",
        content: `以下のコメントに対する返信を作成してください。

投稿の内容: ${postContext}

コメント: ${commentContent}

返信のガイドライン:
- 親切で丁寧な対応
- 簡潔で分かりやすい（50-100文字程度）
- 必要に応じて詳細情報への誘導（ウェブサイトやDMなど）
- 感謝の気持ちを表現`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("AI reply generation returned empty content");
  }

  return content;
}
