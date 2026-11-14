/**
 * 予算書チェック履歴の保存・取得
 * - 一般ユーザーは自分の履歴のみ、管理者は全員分を閲覧できる
 * - 本番DBにマイグレーション（0033）が未適用でも動くよう、初回にテーブルを作成する
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { budgetChecks, users } from "../drizzle/schema";
import type { BudgetCheckResult, DocKind } from "./budget-check";
import { getDb } from "./db";

export type SavedFile = { kind: DocKind; fileName: string; note?: string };

type Viewer = { id: number; role: string };

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS \`budget_checks\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`projectName\` varchar(255) NOT NULL DEFAULT '',
  \`files\` text NOT NULL,
  \`memo\` text,
  \`result\` mediumtext NOT NULL,
  \`findingCount\` int NOT NULL DEFAULT 0,
  \`highCount\` int NOT NULL DEFAULT 0,
  \`grossProfitRate10\` int,
  \`resolved\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`budget_checks_id\` PRIMARY KEY(\`id\`),
  INDEX \`budget_checks_user_created_idx\` (\`userId\`,\`createdAt\`)
)`;

let ensured: Promise<void> | null = null;

async function db() {
  const d = await getDb();
  if (!d) throw new Error("データベースに接続できません");
  if (!ensured) {
    ensured = d.execute(sql.raw(CREATE_SQL)).then(
      () => undefined,
      e => {
        ensured = null;
        throw e;
      },
    );
  }
  await ensured;
  return d;
}

export function summarize(result: BudgetCheckResult) {
  return {
    projectName: (result.projectName || "").slice(0, 255),
    findingCount: result.findings.length,
    highCount: result.findings.filter(f => f.severity === "高").length,
    grossProfitRate10: result.grossProfitRate == null ? null : Math.round(result.grossProfitRate * 10),
  };
}

export function parseResolved(v: string | null | undefined): number[] {
  try {
    const a = JSON.parse(v ?? "[]");
    return Array.isArray(a) ? a.filter((n): n is number => Number.isInteger(n) && n >= 0) : [];
  } catch {
    return [];
  }
}

/** 閲覧・編集可能か（本人 or 管理者） */
const scope = (viewer: Viewer, id: number) =>
  viewer.role === "admin" ? eq(budgetChecks.id, id) : and(eq(budgetChecks.id, id), eq(budgetChecks.userId, viewer.id));

export async function saveBudgetCheck(userId: number, files: SavedFile[], memo: string | undefined, result: BudgetCheckResult) {
  const d = await db();
  const [res] = await d.insert(budgetChecks).values({
    userId,
    files: JSON.stringify(files),
    memo: memo ?? null,
    result: JSON.stringify(result),
    resolved: "[]",
    ...summarize(result),
  });
  return (res as any).insertId as number;
}

export async function listBudgetChecks(viewer: Viewer, limit = 50) {
  const d = await db();
  const rows = await d
    .select({
      id: budgetChecks.id,
      userId: budgetChecks.userId,
      userName: users.name,
      projectName: budgetChecks.projectName,
      files: budgetChecks.files,
      findingCount: budgetChecks.findingCount,
      highCount: budgetChecks.highCount,
      grossProfitRate10: budgetChecks.grossProfitRate10,
      resolved: budgetChecks.resolved,
      createdAt: budgetChecks.createdAt,
    })
    .from(budgetChecks)
    .leftJoin(users, eq(users.id, budgetChecks.userId))
    .where(viewer.role === "admin" ? undefined : eq(budgetChecks.userId, viewer.id))
    .orderBy(desc(budgetChecks.createdAt))
    .limit(limit);

  return rows.map(r => ({
    id: r.id,
    userName: r.userName ?? "",
    projectName: r.projectName,
    fileCount: (JSON.parse(r.files || "[]") as SavedFile[]).length,
    findingCount: r.findingCount,
    highCount: r.highCount,
    resolvedCount: parseResolved(r.resolved).length,
    grossProfitRate: r.grossProfitRate10 == null ? null : r.grossProfitRate10 / 10,
    createdAt: r.createdAt,
  }));
}

export async function getBudgetCheck(viewer: Viewer, id: number) {
  const d = await db();
  const [r] = await d.select().from(budgetChecks).where(scope(viewer, id)).limit(1);
  if (!r) return null;
  return {
    id: r.id,
    projectName: r.projectName,
    files: JSON.parse(r.files || "[]") as SavedFile[],
    memo: r.memo ?? "",
    result: JSON.parse(r.result) as BudgetCheckResult,
    resolved: parseResolved(r.resolved),
    createdAt: r.createdAt,
  };
}

export async function updateBudgetCheck(viewer: Viewer, id: number, patch: { projectName?: string; resolved?: number[] }) {
  const d = await db();
  const set: Record<string, unknown> = {};
  if (patch.projectName !== undefined) set.projectName = patch.projectName.slice(0, 255);
  if (patch.resolved !== undefined) set.resolved = JSON.stringify([...new Set(patch.resolved)].sort((a, b) => a - b));
  if (Object.keys(set).length === 0) return;
  await d.update(budgetChecks).set(set).where(scope(viewer, id));
}

export async function deleteBudgetCheck(viewer: Viewer, id: number) {
  const d = await db();
  await d.delete(budgetChecks).where(scope(viewer, id));
}
