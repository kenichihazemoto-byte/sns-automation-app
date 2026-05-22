import { invokeLLM } from "./_core/llm";

/**
 * 建築点検AIサービス
 * 福岡県住宅供給公社の屋上・外壁定期点検向け
 * モルタルリシン外壁・シート防水屋上のクラック・浮き等を写真から判定
 */

export type DefectType =
  | "ひび割れ（クラック）"
  | "浮き・ふくれ"
  | "剥離・剥落"
  | "欠損・爆裂"
  | "シーリング劣化"
  | "白華（エフロレッセンス）"
  | "錆汁・鉄筋露出"
  | "汚れ・退色"
  | "防水層損傷"
  | "シーム剥離・端部剥離"
  | "水溜まり・排水不良"
  | "植物繁茂"
  | "その他"
  | "異常なし";

export type Severity = "緊急" | "要補修" | "要観察" | "軽微" | "問題なし";

export type SurfaceType =
  | "外壁モルタルリシン"
  | "屋上シート防水"
  | "外壁その他"
  | "屋上その他"
  | "判定不能";

export interface InspectionFinding {
  defect_type: DefectType;
  severity: Severity;
  location_in_image: string;
  description: string;
  estimated_size: string;
  possible_cause: string;
  recommended_action: string;
  requires_hammer_test: boolean; // 打音検査が別途必要か
}

export interface InspectionResult {
  surface_type: SurfaceType;
  overall_assessment: Severity;
  findings: InspectionFinding[];
  notes_for_manual_check: string;
  confidence: number; // 0.0 - 1.0
  summary_jp: string; // 日本語の要約
}

const SYSTEM_PROMPT = `あなたは、福岡県住宅供給公社の集合住宅（団地）の定期点検を行う、建築物点検技士・一級建築士相当の専門家です。
点検対象は以下のとおりです:
- 外壁: モルタルリシン吹付仕上げが大半
- 屋上防水: シート防水（塩ビ系またはゴム系）が大半

写真から目視で確認可能な以下の劣化・損傷を判定してください:

【外壁モルタルリシンで多い劣化】
- ひび割れ（ヘアクラック / 構造クラック）
- 浮き・ふくれ（モルタル層の躯体からの剥離）
- 剥離・剥落
- 爆裂（鉄筋腐食膨張による）
- 白華（エフロレッセンス）
- 汚れ・退色・チョーキング
- シーリング劣化
- 錆汁

【屋上シート防水で多い劣化】
- シート破断・損傷
- シーム（継ぎ目）剥離・端部剥離
- ふくれ（下地との浮き・水分膨張）
- 水溜まり・排水不良
- 植物繁茂（雑草・苔）
- 立上り部の損傷
- 退色・劣化

【判定上の重要な注意事項】
1. 「浮き」は本来、打音検査または赤外線サーモグラフィで確定するもの。写真からは「ふくれ・周辺のクラックパターン・色変化」など二次的兆候しか判定できないため、該当箇所には必ず requires_hammer_test=true をセットし、recommended_actionに「打音検査での確認推奨」と明記してください。
2. 0.2mm以下のヘアクラックは写真では判定が困難なため、confidenceを下げてください。
3. ひび割れの幅は推定で結構ですが、目安として「ヘアクラック（0.3mm未満）」「軽微（0.3〜1mm）」「要注意（1mm以上）」を判定基準にしてください。

severity 判定基準:
- 緊急: 落下・漏水など第三者被害につながる恐れあり、早急な補修が必要
- 要補修: 次回点検までに補修すべき
- 要観察: 経過観察、次回点検で再確認
- 軽微: 美観上の問題のみ
- 問題なし: 劣化なし

写真が点検対象（モルタル外壁・シート防水屋上）でない場合や、判定に十分な解像度がない場合は、surface_typeを「判定不能」、confidenceを低く設定してください。`;

export async function analyzeInspectionPhoto(params: {
  imageUrl: string;
  surfaceTypeHint?: "外壁" | "屋上" | "自動判定";
  locationContext?: string; // 例: "小倉北区下到津団地 3号棟 東面 3階"
}): Promise<InspectionResult> {
  const { imageUrl, surfaceTypeHint = "自動判定", locationContext } = params;

  const userText = [
    "次の写真を建築点検の観点から分析してください。",
    surfaceTypeHint !== "自動判定"
      ? `点検対象部位: ${surfaceTypeHint}（${surfaceTypeHint === "外壁" ? "モルタルリシン想定" : "シート防水想定"}）`
      : "点検対象部位: 自動判定（外壁モルタルリシン または 屋上シート防水）",
    locationContext ? `撮影場所: ${locationContext}` : "",
    "",
    "見つかった劣化・損傷をすべて findings 配列に列挙し、それぞれ severity を判定してください。",
    "劣化が見つからない場合は findings に1件、defect_type='異常なし', severity='問題なし' の項目を入れてください。",
    "summary_jp には、現場担当者が見て即理解できる1〜2文の要約を日本語で書いてください。",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "building_inspection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            surface_type: {
              type: "string",
              enum: [
                "外壁モルタルリシン",
                "屋上シート防水",
                "外壁その他",
                "屋上その他",
                "判定不能",
              ],
            },
            overall_assessment: {
              type: "string",
              enum: ["緊急", "要補修", "要観察", "軽微", "問題なし"],
            },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  defect_type: {
                    type: "string",
                    enum: [
                      "ひび割れ（クラック）",
                      "浮き・ふくれ",
                      "剥離・剥落",
                      "欠損・爆裂",
                      "シーリング劣化",
                      "白華（エフロレッセンス）",
                      "錆汁・鉄筋露出",
                      "汚れ・退色",
                      "防水層損傷",
                      "シーム剥離・端部剥離",
                      "水溜まり・排水不良",
                      "植物繁茂",
                      "その他",
                      "異常なし",
                    ],
                  },
                  severity: {
                    type: "string",
                    enum: ["緊急", "要補修", "要観察", "軽微", "問題なし"],
                  },
                  location_in_image: { type: "string" },
                  description: { type: "string" },
                  estimated_size: { type: "string" },
                  possible_cause: { type: "string" },
                  recommended_action: { type: "string" },
                  requires_hammer_test: { type: "boolean" },
                },
                required: [
                  "defect_type",
                  "severity",
                  "location_in_image",
                  "description",
                  "estimated_size",
                  "possible_cause",
                  "recommended_action",
                  "requires_hammer_test",
                ],
                additionalProperties: false,
              },
            },
            notes_for_manual_check: { type: "string" },
            confidence: { type: "number" },
            summary_jp: { type: "string" },
          },
          required: [
            "surface_type",
            "overall_assessment",
            "findings",
            "notes_for_manual_check",
            "confidence",
            "summary_jp",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("点検AI分析が空の結果を返しました");
  }
  return JSON.parse(content) as InspectionResult;
}

export interface BatchInspectionItem {
  photoId: string;
  imageUrl: string;
  locationContext?: string;
  result: InspectionResult;
}

export interface InspectionReportSummary {
  totalPhotos: number;
  byOverall: Record<Severity, number>;
  byDefectType: Record<string, number>;
  urgentItems: BatchInspectionItem[];
  needsHammerTest: BatchInspectionItem[];
}

export function summarizeReport(
  items: BatchInspectionItem[]
): InspectionReportSummary {
  const byOverall: Record<Severity, number> = {
    緊急: 0,
    要補修: 0,
    要観察: 0,
    軽微: 0,
    問題なし: 0,
  };
  const byDefectType: Record<string, number> = {};
  const urgentItems: BatchInspectionItem[] = [];
  const needsHammerTest: BatchInspectionItem[] = [];

  for (const item of items) {
    byOverall[item.result.overall_assessment] =
      (byOverall[item.result.overall_assessment] ?? 0) + 1;
    if (item.result.overall_assessment === "緊急") urgentItems.push(item);
    for (const f of item.result.findings) {
      byDefectType[f.defect_type] = (byDefectType[f.defect_type] ?? 0) + 1;
      if (f.requires_hammer_test && !needsHammerTest.includes(item)) {
        needsHammerTest.push(item);
      }
    }
  }

  return {
    totalPhotos: items.length,
    byOverall,
    byDefectType,
    urgentItems,
    needsHammerTest,
  };
}
