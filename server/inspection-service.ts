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
  /** 画像内の劣化位置。すべて 0.0〜1.0 の正規化座標（原点=左上） */
  bbox: { x: number; y: number; width: number; height: number };
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

【bbox（バウンディングボックス）の指定方法】
各 finding には bbox を必ず指定してください。座標は画像の左上を原点(0,0)、右下を(1,1)とする
正規化座標です（0.0〜1.0）。x,y は劣化箇所を囲む矩形の左上、width/height は矩形の幅と高さ。
- 線状のひび割れの場合: 線全体を含む最小矩形を返す
- 点状の浮きやふくれの場合: 中心から少し余裕を持たせた小さめの矩形を返す
- 「異常なし」の場合: bbox = {x:0, y:0, width:0, height:0} を返す
- 画像全体に及ぶ劣化（広範な退色等）: {x:0, y:0, width:1, height:1} を返す

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
                  bbox: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" },
                      width: { type: "number" },
                      height: { type: "number" },
                    },
                    required: ["x", "y", "width", "height"],
                    additionalProperties: false,
                  },
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
                  "bbox",
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

export type ChangeKind =
  | "新規発生"
  | "悪化"
  | "改善・補修済み"
  | "変化なし"
  | "判定困難";

export interface ComparisonFinding {
  defect_label: string; // 比較対象となる劣化の通称
  change_kind: ChangeKind;
  description: string; // 何がどう変わったか
  previous_state: string; // 過去写真での状態
  current_state: string; // 今回写真での状態
  severity_now: Severity;
  recommended_action: string;
}

export interface InspectionComparison {
  overall_change: ChangeKind;
  summary_jp: string;
  changes: ComparisonFinding[];
  confidence: number;
  notes: string;
}

const COMPARE_SYSTEM_PROMPT = `あなたは建築物の経年劣化を判定する点検技士です。
2枚の写真（過去・現在）を比較し、同じ部位の劣化がどう変化したかを判定します。
判定上の注意:
- 撮影角度や光量が異なる場合は確実な比較は困難なため、confidenceを下げる
- 同じクラックが伸びた・幅が広がった場合は「悪化」
- 同じクラックが補修跡で塞がれている場合は「改善・補修済み」
- 新たに発生した劣化は「新規発生」
- 前回写真の劣化が現在も同程度なら「変化なし」`;

export async function compareInspectionPhotos(params: {
  previousImageUrl: string;
  previousSurveyDate: string;
  previousAiSummary: string;
  currentImageUrl: string;
  currentSurveyDate: string;
  currentAiSummary: string;
  locationContext?: string;
}): Promise<InspectionComparison> {
  const {
    previousImageUrl,
    previousSurveyDate,
    previousAiSummary,
    currentImageUrl,
    currentSurveyDate,
    currentAiSummary,
    locationContext,
  } = params;

  const userText = [
    "次の2枚の写真は、同一の点検箇所を別の時期に撮影したものです。",
    locationContext ? `点検箇所: ${locationContext}` : "",
    `■ 1枚目（過去・撮影日: ${previousSurveyDate}）`,
    `過去のAI判定要約: ${previousAiSummary}`,
    `■ 2枚目（現在・撮影日: ${currentSurveyDate}）`,
    `現在のAI判定要約: ${currentAiSummary}`,
    "",
    "両者を比較し、新規発生・悪化・改善・変化なしの観点で変化を列挙してください。",
    "summary_jp には現場担当者向けの1〜2文の要約を書いてください。",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      { role: "system", content: COMPARE_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: previousImageUrl, detail: "high" } },
          { type: "image_url", image_url: { url: currentImageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "inspection_comparison",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overall_change: {
              type: "string",
              enum: ["新規発生", "悪化", "改善・補修済み", "変化なし", "判定困難"],
            },
            summary_jp: { type: "string" },
            changes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  defect_label: { type: "string" },
                  change_kind: {
                    type: "string",
                    enum: ["新規発生", "悪化", "改善・補修済み", "変化なし", "判定困難"],
                  },
                  description: { type: "string" },
                  previous_state: { type: "string" },
                  current_state: { type: "string" },
                  severity_now: {
                    type: "string",
                    enum: ["緊急", "要補修", "要観察", "軽微", "問題なし"],
                  },
                  recommended_action: { type: "string" },
                },
                required: [
                  "defect_label",
                  "change_kind",
                  "description",
                  "previous_state",
                  "current_state",
                  "severity_now",
                  "recommended_action",
                ],
                additionalProperties: false,
              },
            },
            confidence: { type: "number" },
            notes: { type: "string" },
          },
          required: ["overall_change", "summary_jp", "changes", "confidence", "notes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("比較AIが空の結果を返しました");
  }
  return JSON.parse(content) as InspectionComparison;
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
