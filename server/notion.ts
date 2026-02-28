/**
 * Notion連携ヘルパー
 * 投稿内容・日時をNotionデータベースに同期する
 */
import { Client } from "@notionhq/client";

let _notion: Client | null = null;

export function getNotionClient(token: string): Client {
  if (!_notion) {
    _notion = new Client({ auth: token });
  }
  return _notion;
}

export function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export interface NotionPostRecord {
  title: string;
  platform: string;
  companyName: string;
  postText: string;
  scheduledAt?: Date;
  status: "draft" | "scheduled" | "posted" | "failed";
  imageUrl?: string;
  hashtags?: string;
}

/**
 * Notionデータベースに投稿レコードを作成する
 */
export async function createNotionPage(
  token: string,
  databaseId: string,
  record: NotionPostRecord
): Promise<{ pageId: string; url: string }> {
  const notion = createNotionClient(token);

  const properties: Record<string, unknown> = {
    // タイトル列（必須）
    Name: {
      title: [{ text: { content: record.title } }],
    },
    // プラットフォーム
    プラットフォーム: {
      select: { name: record.platform },
    },
    // 会社名
    会社名: {
      select: { name: record.companyName },
    },
    // 投稿ステータス
    ステータス: {
      select: { name: statusLabel(record.status) },
    },
    // 投稿文
    投稿文: {
      rich_text: [{ text: { content: record.postText.slice(0, 2000) } }],
    },
  };

  // 予約日時
  if (record.scheduledAt) {
    properties["予約日時"] = {
      date: { start: record.scheduledAt.toISOString() },
    };
  }

  // ハッシュタグ
  if (record.hashtags) {
    properties["ハッシュタグ"] = {
      rich_text: [{ text: { content: record.hashtags.slice(0, 2000) } }],
    };
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });

  return {
    pageId: response.id,
    url: (response as { url?: string }).url ?? `https://notion.so/${response.id.replace(/-/g, "")}`,
  };
}

/**
 * Notionページのステータスを更新する
 */
export async function updateNotionPageStatus(
  token: string,
  pageId: string,
  status: NotionPostRecord["status"]
): Promise<void> {
  const notion = createNotionClient(token);
  await notion.pages.update({
    page_id: pageId,
    properties: {
      ステータス: {
        select: { name: statusLabel(status) },
      },
    },
  });
}

/**
 * Notionデータベースの接続テスト
 */
export async function testNotionConnection(
  token: string,
  databaseId: string
): Promise<{ success: boolean; databaseTitle: string; error?: string }> {
  try {
    const notion = createNotionClient(token);
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const titleProp = (db as { title?: Array<{ plain_text?: string }> }).title;
    const databaseTitle =
      titleProp?.[0]?.plain_text ?? "（タイトルなし）";
    return { success: true, databaseTitle };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, databaseTitle: "", error: message };
  }
}

function statusLabel(status: NotionPostRecord["status"]): string {
  const map: Record<string, string> = {
    draft: "下書き",
    scheduled: "予約済み",
    posted: "投稿済み",
    failed: "失敗",
  };
  return map[status] ?? status;
}
