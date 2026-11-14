/**
 * 予算書チェック
 *
 * 工務（安元さん）が作成した実行予算書を、設計図書・工事請負契約書・仕上げ表
 * （＋任意で協力業者の見積書）と突き合わせ、
 *   - 予算項目の計上漏れ
 *   - 数量の過不足（図面からの拾いとの差）
 *   - 仕様・型番の不一致（仕上げ表・契約書との差）
 *   - 単価・金額の妥当性（業者見積との差）
 *   - 契約金額と予算の関係（粗利）
 * を AI に洗い出させる。
 */
import { invokeLLM, type MessageContent } from "./_core/llm";

/** 資料の種類 */
export const DOC_KINDS = {
  budget: { label: "実行予算書", required: true },
  drawings: { label: "設計図書", required: true },
  contract: { label: "工事請負契約書", required: true },
  finishes: { label: "仕上げ表", required: true },
  quotes: { label: "協力業者見積書", required: false },
} as const;

export type DocKind = keyof typeof DOC_KINDS;

export type BudgetDoc = {
  kind: DocKind;
  fileName: string;
  /** PDF・画像はアップロード後の URL を渡す */
  url?: string;
  mimeType?: string;
  /** Excel / CSV はブラウザでテキスト化して渡す */
  text?: string;
  /** 業者見積の場合の業者名・工種（任意） */
  note?: string;
};

/** 木造新築の工種リスト（網羅チェック用） */
export const WORK_CATEGORIES = [
  "仮設工事",
  "解体・撤去工事",
  "地盤調査・地盤改良工事",
  "土工事",
  "基礎工事",
  "木工事（構造材・プレカット）",
  "木工事（造作材・大工手間）",
  "屋根・板金工事",
  "防水工事",
  "外壁工事",
  "断熱・気密工事",
  "サッシ・ガラス工事",
  "金属製建具・シャッター工事",
  "木製建具工事",
  "内装工事（クロス・床）",
  "左官・タイル工事",
  "塗装工事",
  "住宅設備（キッチン・UB・洗面・トイレ）",
  "給排水衛生設備工事",
  "電気設備工事",
  "空調・換気設備工事",
  "太陽光・蓄電池（ZEH）",
  "ガス・給湯設備工事",
  "外構・擁壁工事",
  "家具・カーテン・照明器具",
  "設計・申請・検査費（確認申請・長期優良・BELS等）",
  "諸経費・保険・瑕疵担保・現場管理費",
] as const;

export const SEVERITIES = ["高", "中", "低"] as const;
export const FINDING_TYPES = [
  "計上漏れ",
  "数量差異",
  "仕様不一致",
  "単価・金額",
  "契約との不整合",
  "要確認",
] as const;

export type Finding = {
  severity: (typeof SEVERITIES)[number];
  type: (typeof FINDING_TYPES)[number];
  category: string;
  item: string;
  budgetValue: string;
  referenceValue: string;
  source: string;
  detail: string;
  action: string;
  estimatedImpactYen: number | null;
};

export type CategoryCoverage = {
  category: string;
  status: "計上あり" | "計上なし" | "要確認" | "対象外";
  budgetAmountYen: number | null;
  comment: string;
};

export type BudgetCheckResult = {
  projectName: string;
  overview: string;
  contractAmountYen: number | null;
  budgetTotalYen: number | null;
  grossProfitYen: number | null;
  grossProfitRate: number | null;
  findings: Finding[];
  coverage: CategoryCoverage[];
  questionsForKoumu: string[];
  missingInfo: string[];
};

export const RESULT_SCHEMA = {
  name: "budget_check_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "projectName",
      "overview",
      "contractAmountYen",
      "budgetTotalYen",
      "findings",
      "coverage",
      "questionsForKoumu",
      "missingInfo",
    ],
    properties: {
      projectName: { type: "string", description: "工事名・邸名（不明なら空文字）" },
      overview: { type: "string", description: "全体の総評（300字程度）" },
      contractAmountYen: {
        type: ["number", "null"],
        description: "契約書の請負金額（税抜・円）。読み取れなければ null",
      },
      budgetTotalYen: {
        type: ["number", "null"],
        description: "実行予算書の合計（税抜・円）。読み取れなければ null",
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "severity",
            "type",
            "category",
            "item",
            "budgetValue",
            "referenceValue",
            "source",
            "detail",
            "action",
            "estimatedImpactYen",
          ],
          properties: {
            severity: { type: "string", enum: [...SEVERITIES] },
            type: { type: "string", enum: [...FINDING_TYPES] },
            category: { type: "string", description: "工種" },
            item: { type: "string", description: "対象の項目名" },
            budgetValue: { type: "string", description: "予算書上の記載（数量・単価・金額）。記載なしなら「記載なし」" },
            referenceValue: { type: "string", description: "図面・仕上げ表・契約書・見積書上の値" },
            source: { type: "string", description: "根拠の資料名とページ・図面番号" },
            detail: { type: "string", description: "何が問題か" },
            action: { type: "string", description: "推奨する対応" },
            estimatedImpactYen: {
              type: ["number", "null"],
              description: "予算への影響額の概算（円）。算定できなければ null",
            },
          },
        },
      },
      coverage: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "status", "budgetAmountYen", "comment"],
          properties: {
            category: { type: "string" },
            status: { type: "string", enum: ["計上あり", "計上なし", "要確認", "対象外"] },
            budgetAmountYen: { type: ["number", "null"] },
            comment: { type: "string" },
          },
        },
      },
      questionsForKoumu: {
        type: "array",
        items: { type: "string" },
        description: "工務（予算作成者）へ確認すべき事項",
      },
      missingInfo: {
        type: "array",
        items: { type: "string" },
        description: "判定に必要だが資料から読み取れなかった情報",
      },
    },
  },
} as const;

export function validateDocs(docs: BudgetDoc[]): string[] {
  const errors: string[] = [];
  for (const [kind, meta] of Object.entries(DOC_KINDS)) {
    if (meta.required && !docs.some(d => d.kind === kind)) {
      errors.push(`${meta.label}が添付されていません`);
    }
  }
  for (const d of docs) {
    if (!d.url && !d.text?.trim()) errors.push(`${d.fileName} の内容が空です`);
  }
  return errors;
}

export function buildSystemPrompt(): string {
  return `あなたはハゼモト建設株式会社（北九州市・木造注文住宅／HEAT20 G2・ZEH標準・耐震等級3・長期優良住宅）の
積算・工事管理のベテランです。工務担当が作成した「実行予算書」を、設計図書・工事請負契約書・仕上げ表・協力業者見積書と
突き合わせてチェックし、着工前に予算の漏れや誤りを潰すことが仕事です。

## チェック観点
1. 計上漏れ：図面・仕上げ表・契約書（特記・オプション・追加工事）にあるのに予算書にない項目
   - 例：仕上げ表の床材・クロス・設備機器、図面の造作家具・ニッチ・カップボード、外構、擁壁、
     地盤改良、太陽光、床下エアコン、カーテンレール、照明器具、申請・検査費、産廃処分費、仮設トイレ・足場・養生
2. 数量差異：図面から拾える数量（延床・施工床面積、外壁面積、屋根面積、基礎周長、建具数、設備台数、
   コンセント・照明箇所数など）と予算書の数量が大きく違う項目（概ね±10%超、建具・設備は1個でも違えば指摘）
3. 仕様不一致：仕上げ表・契約書の仕様（メーカー・品番・グレード・色）と予算書・業者見積の仕様が違う
4. 単価・金額：業者見積と予算の金額差、桁違い・数量×単価の計算誤り、相場から大きく外れた単価
5. 契約との不整合：契約金額・工期・支払条件・特約・含まれる工事範囲（別途工事）と予算の関係
6. 粗利：契約金額（税抜）− 予算合計（税抜）の粗利額・粗利率。著しく低い（20%未満）・高い場合は指摘

## ルール
- 根拠は必ず「資料名＋ページ／図面番号／行」で示す。資料から読み取れないことを推測で断定しない（その場合は type=要確認）
- 金額は円単位の数値（税抜）。不明は null
- severity：高＝金額影響が大きい・施工上必須の漏れ／中＝確認が必要な差異／低＝表記ゆれ・軽微
- findings は重要度の高い順に並べる。細かすぎる指摘を大量に出すより、実害のあるものを確実に
- coverage は次の工種すべてについて判定する：${WORK_CATEGORIES.join("、")}
- 業者見積が無い工種の単価妥当性は、北九州エリアの一般的な相場観でコメントする
- 回答はすべて日本語`;
}

function docHeader(d: BudgetDoc, index: number): string {
  const label = DOC_KINDS[d.kind].label;
  const note = d.note ? `（${d.note}）` : "";
  return `【資料${index + 1}：${label}${note}】ファイル名: ${d.fileName}`;
}

/** Excel由来のテキストが長すぎるとき末尾を切る */
export const MAX_TEXT_CHARS = 120_000;

export function buildUserContent(docs: BudgetDoc[], memo?: string): MessageContent[] {
  const order: DocKind[] = ["budget", "contract", "finishes", "drawings", "quotes"];
  const sorted = [...docs].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  const parts: MessageContent[] = [
    {
      type: "text",
      text: `以下の資料をもとに実行予算書をチェックしてください。${
        memo?.trim() ? `\n\n## 担当者からの補足\n${memo.trim()}` : ""
      }`,
    },
  ];

  sorted.forEach((d, i) => {
    parts.push({ type: "text", text: docHeader(d, i) });
    if (d.text?.trim()) {
      const t = d.text.length > MAX_TEXT_CHARS ? `${d.text.slice(0, MAX_TEXT_CHARS)}\n…（以下省略）` : d.text;
      parts.push({ type: "text", text: t });
    } else if (d.url) {
      if (d.mimeType?.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: d.url, detail: "high" } });
      } else {
        parts.push({ type: "file_url", file_url: { url: d.url, mime_type: "application/pdf" } });
      }
    }
  });

  if (!docs.some(d => d.kind === "quotes")) {
    parts.push({
      type: "text",
      text: "※協力業者見積書は添付されていません。単価の妥当性は相場観で判断し、見積取得を推奨する工種があれば questionsForKoumu に含めてください。",
    });
  }
  return parts;
}

const SEVERITY_RANK: Record<string, number> = { 高: 0, 中: 1, 低: 2 };

/** AI の出力を整形し、粗利を計算して重要度順に並べる */
export function normalizeResult(raw: unknown): BudgetCheckResult {
  const r = (raw ?? {}) as Partial<BudgetCheckResult>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const contract = num(r.contractAmountYen);
  const budget = num(r.budgetTotalYen);
  const gross = contract !== null && budget !== null ? contract - budget : null;
  const rate = gross !== null && contract ? Math.round((gross / contract) * 1000) / 10 : null;

  const findings = (Array.isArray(r.findings) ? r.findings : [])
    .map(f => ({
      severity: SEVERITIES.includes(f?.severity as any) ? f.severity : "中",
      type: FINDING_TYPES.includes(f?.type as any) ? f.type : "要確認",
      category: String(f?.category ?? ""),
      item: String(f?.item ?? ""),
      budgetValue: String(f?.budgetValue ?? ""),
      referenceValue: String(f?.referenceValue ?? ""),
      source: String(f?.source ?? ""),
      detail: String(f?.detail ?? ""),
      action: String(f?.action ?? ""),
      estimatedImpactYen: num(f?.estimatedImpactYen),
    }) as Finding)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return {
    projectName: String(r.projectName ?? ""),
    overview: String(r.overview ?? ""),
    contractAmountYen: contract,
    budgetTotalYen: budget,
    grossProfitYen: gross,
    grossProfitRate: rate,
    findings,
    coverage: Array.isArray(r.coverage) ? r.coverage : [],
    questionsForKoumu: Array.isArray(r.questionsForKoumu) ? r.questionsForKoumu.map(String) : [],
    missingInfo: Array.isArray(r.missingInfo) ? r.missingInfo.map(String) : [],
  };
}

export function parseLLMJson(content: unknown): unknown {
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map(p => (p && typeof p === "object" && "text" in p ? (p as any).text : "")).join("")
        : "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AIの応答を解析できませんでした。もう一度実行してください。");
  }
}

export async function runBudgetCheck(docs: BudgetDoc[], memo?: string): Promise<BudgetCheckResult> {
  const errors = validateDocs(docs);
  if (errors.length) throw new Error(errors.join(" / "));

  const res = await invokeLLM({
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserContent(docs, memo) },
    ],
    outputSchema: RESULT_SCHEMA as any,
  });
  const content = res.choices?.[0]?.message?.content;
  return normalizeResult(parseLLMJson(content));
}
