import { describe, expect, it } from "vitest";
import {
  buildUserContent,
  MAX_TEXT_CHARS,
  normalizeResult,
  parseLLMJson,
  validateDocs,
  type BudgetDoc,
} from "../budget-check";

const full: BudgetDoc[] = [
  { kind: "budget", fileName: "予算書.xlsx", text: "基礎工事,1式,1500000" },
  { kind: "drawings", fileName: "図面.pdf", url: "https://example.com/a.pdf", mimeType: "application/pdf" },
  { kind: "contract", fileName: "契約書.pdf", url: "https://example.com/b.pdf", mimeType: "application/pdf" },
  { kind: "finishes", fileName: "仕上表.jpg", url: "https://example.com/c.jpg", mimeType: "image/jpeg" },
];

describe("validateDocs", () => {
  it("4点そろえばOK（業者見積は任意）", () => {
    expect(validateDocs(full)).toEqual([]);
  });
  it("必須資料の欠落を指摘する", () => {
    const errs = validateDocs(full.filter(d => d.kind !== "finishes"));
    expect(errs).toEqual(["仕上げ表が添付されていません"]);
  });
  it("中身が空の資料を指摘する", () => {
    const errs = validateDocs([...full, { kind: "quotes", fileName: "空.csv", text: "  " }]);
    expect(errs[0]).toContain("空.csv");
  });
});

describe("buildUserContent", () => {
  it("予算書→契約書→仕上表→図面の順に並べ、種類ごとに正しい形式で渡す", () => {
    const parts = buildUserContent([...full].reverse(), "外構は別途");
    const texts = parts.filter((p: any) => p.type === "text").map((p: any) => p.text);
    expect(texts[0]).toContain("外構は別途");
    const headers = texts.filter(t => t.startsWith("【資料"));
    expect(headers.map(h => h.match(/：(.+?)】/)?.[1])).toEqual(["実行予算書", "工事請負契約書", "仕上げ表", "設計図書"]);
    expect(parts.some((p: any) => p.type === "file_url")).toBe(true);
    expect(parts.some((p: any) => p.type === "image_url")).toBe(true);
    expect(texts.at(-1)).toContain("協力業者見積書は添付されていません");
  });
  it("業者見積があれば注記を出さず、業者名を見出しに含める", () => {
    const parts = buildUserContent([...full, { kind: "quotes", fileName: "q.pdf", url: "https://x/q.pdf", note: "九州シンセイ 外構" }]);
    const texts = parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
    expect(texts).toContain("協力業者見積書（九州シンセイ 外構）");
    expect(texts).not.toContain("添付されていません");
  });
  it("長すぎる表データは切り詰める", () => {
    const parts = buildUserContent([{ ...full[0], text: "a".repeat(MAX_TEXT_CHARS + 10) }, ...full.slice(1)]);
    const t = parts.find((p: any) => p.type === "text" && p.text.startsWith("aaa")) as any;
    expect(t.text.endsWith("（以下省略）")).toBe(true);
  });
});

describe("normalizeResult", () => {
  it("粗利を計算し、指摘を重要度順に並べる", () => {
    const r = normalizeResult({
      projectName: "○○邸",
      contractAmountYen: 30_000_000,
      budgetTotalYen: 24_000_000,
      findings: [
        { severity: "低", type: "要確認", item: "a" },
        { severity: "高", type: "計上漏れ", item: "b", estimatedImpactYen: 300000 },
        { severity: "変", type: "謎", item: "c" },
      ],
    });
    expect(r.grossProfitYen).toBe(6_000_000);
    expect(r.grossProfitRate).toBe(20);
    expect(r.findings.map(f => f.item)).toEqual(["b", "c", "a"]);
    expect(r.findings[1]).toMatchObject({ severity: "中", type: "要確認", estimatedImpactYen: null });
  });
  it("金額が読めなければ粗利は null", () => {
    const r = normalizeResult({ contractAmountYen: null, budgetTotalYen: 100 });
    expect(r.grossProfitYen).toBeNull();
    expect(r.grossProfitRate).toBeNull();
    expect(r.coverage).toEqual([]);
  });
});

describe("parseLLMJson", () => {
  it("コードフェンス付きJSONも読める", () => {
    expect(parseLLMJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("前後に文章があっても読める", () => {
    expect(parseLLMJson('結果です {"a":2} 以上')).toEqual({ a: 2 });
  });
});

import { parseResolved, summarize } from "../budget-check-history";

describe("履歴の要約", () => {
  it("件数・高の件数・粗利率（×10）をまとめる", () => {
    const r = normalizeResult({
      projectName: "○○邸 新築工事",
      contractAmountYen: 30_000_000,
      budgetTotalYen: 23_000_000,
      findings: [{ severity: "高" }, { severity: "高" }, { severity: "低" }],
    });
    expect(summarize(r)).toEqual({ projectName: "○○邸 新築工事", findingCount: 3, highCount: 2, grossProfitRate10: 233 });
  });
  it("対応済みインデックスの壊れたデータは無視する", () => {
    expect(parseResolved("[0,2,-1,1.5,\"x\"]")).toEqual([0, 2]);
    expect(parseResolved("壊れた")).toEqual([]);
    expect(parseResolved(null)).toEqual([]);
  });
});
