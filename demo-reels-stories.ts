import { invokeLLM } from './server/_core/llm';

interface ImageAnalysisResult {
  category: string;
  style: string;
  description: string;
  keywords: string[];
}

interface ReelsStoriesContent {
  shortText: string;
  style: string;
  usage: string;
}

async function generateReelsStoriesContent(
  imageAnalysis: ImageAnalysisResult,
  companyName: "ハゼモト建設" | "クリニックアーキプロ",
  contentType: "hook" | "question" | "emotion" | "cta" | "storytelling"
): Promise<ReelsStoriesContent> {
  const targetAudience = companyName === "ハゼモト建設" 
    ? {
        name: "住宅購入検討者（一般ユーザー）",
        tone: "親しみやすく、共感を呼ぶ温かい表現",
        keywords: ["家族", "夢のマイホーム", "快適な暮らし"]
      }
    : {
        name: "医療関係者（医師、クリニック経営者）",
        tone: "専門的で信頼感のある表現",
        keywords: ["患者様体験", "医療環境", "機能性"]
      };

  const contentTypeGuide = {
    hook: {
      description: "視聴者の注意を引く冒頭のフレーズ",
      example: "「え、これ本当に同じ家？」",
      length: "5-15文字"
    },
    question: {
      description: "視聴者に問いかけて興味を引く",
      example: "「理想のリビング、どんな空間ですか？」",
      length: "15-25文字"
    },
    emotion: {
      description: "感情に訴えかける表現",
      example: "「家族の笑顔が集まる場所✨」",
      length: "10-20文字"
    },
    cta: {
      description: "行動を促す呼びかけ",
      example: "「詳しくはプロフィールから👆」",
      length: "10-20文字"
    },
    storytelling: {
      description: "短いストーリー形式",
      example: "「朝、光が差し込むキッチンで淹れるコーヒー。これが私の理想の暮らし☕」",
      length: "20-40文字"
    }
  };

  const guide = contentTypeGuide[contentType];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `あなたは${companyName}のSNSマーケティング担当者です。
ターゲット: ${targetAudience.name}
トーン: ${targetAudience.tone}

Instagram ReelsやStoriesに最適な、短くてキャッチーな文章を作成してください。`
      },
      {
        role: "user",
        content: `以下の画像分析結果に基づいて、${contentType}スタイルの短文を生成してください。

画像分析結果:
- カテゴリー: ${imageAnalysis.category}
- スタイル: ${imageAnalysis.style}
- 説明: ${imageAnalysis.description}
- キーワード: ${imageAnalysis.keywords.join(", ")}

コンテンツタイプ: ${contentType}
説明: ${guide.description}
例: ${guide.example}
文字数: ${guide.length}

短くてインパクトのある文章を1つ生成してください。`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "reels_stories_content",
        strict: true,
        schema: {
          type: "object",
          properties: {
            shortText: {
              type: "string",
              description: "生成された短文"
            },
            style: {
              type: "string",
              description: "文章のスタイル説明"
            },
            usage: {
              type: "string",
              description: "使用シーン"
            }
          },
          required: ["shortText", "style", "usage"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("AI content generation returned empty content");
  }

  return JSON.parse(content);
}

// デモ実行
async function demo() {
  const mockImageAnalysis: ImageAnalysisResult = {
    category: "リビング",
    style: "モダン",
    description: "広々としたリビングルームで、大きな窓から自然光が差し込んでいます。",
    keywords: ["リビング", "自然光", "広々", "モダン", "家族"]
  };

  console.log("=== リール・ストーリーズ用短文生成デモ ===\n");
  console.log("【ハゼモト建設】住宅購入検討者向け\n");

  const contentTypes: Array<"hook" | "question" | "emotion" | "cta" | "storytelling"> = 
    ["hook", "question", "emotion", "cta", "storytelling"];

  for (const type of contentTypes) {
    console.log(`\n--- ${type.toUpperCase()}スタイル ---`);
    const result = await generateReelsStoriesContent(
      mockImageAnalysis,
      "ハゼモト建設",
      type
    );
    console.log(`短文: ${result.shortText}`);
    console.log(`スタイル: ${result.style}`);
    console.log(`使用シーン: ${result.usage}`);
  }

  // クリニックアーキプロの例
  const clinicAnalysis: ImageAnalysisResult = {
    category: "待合室",
    style: "モダン",
    description: "清潔感のある待合室で、患者様がリラックスできる空間です。",
    keywords: ["待合室", "清潔感", "リラックス", "モダン", "患者様"]
  };

  console.log("\n\n【クリニックアーキプロ】医療関係者向け\n");

  for (const type of contentTypes) {
    console.log(`\n--- ${type.toUpperCase()}スタイル ---`);
    const result = await generateReelsStoriesContent(
      clinicAnalysis,
      "クリニックアーキプロ",
      type
    );
    console.log(`短文: ${result.shortText}`);
    console.log(`スタイル: ${result.style}`);
    console.log(`使用シーン: ${result.usage}`);
  }
}

demo().catch(console.error);
