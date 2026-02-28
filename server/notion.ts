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

/**
 * Notionデータベースから変更されたレコードを取得する（双方向同期）
 * Notionで予約日時・ステータスが変更されたレコードをアプリに反映するために使用
 */
export interface NotionSyncRecord {
  pageId: string;
  title: string;
  platform: string;
  companyName: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  scheduledAt?: Date;
  postText?: string;
  hashtags?: string;
  lastEditedAt: Date;
}

export async function fetchNotionChanges(
  token: string,
  databaseId: string,
  sinceDate?: Date
): Promise<NotionSyncRecord[]> {
  const notion = createNotionClient(token);

  const filter: Record<string, unknown> = sinceDate
    ? {
        timestamp: "last_edited_time",
        last_edited_time: {
          after: sinceDate.toISOString(),
        },
      }
    : {};

  const queryParams: Record<string, unknown> = {
    database_id: databaseId,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    page_size: 100,
  };
  if (Object.keys(filter).length > 0) {
    queryParams["filter"] = filter;
  }

  // @notionhq/client v5: dataSources.query is the correct method for database queries
  const response = await (notion as unknown as { dataSources: { query: (params: Record<string, unknown>) => Promise<{ results: unknown[] }> } }).dataSources.query(queryParams);

  const records: NotionSyncRecord[] = [];

  type NotionPage = { id: string; last_edited_time: string; properties: Record<string, unknown> };

  for (const rawPage of response.results) {
    const page = rawPage as NotionPage;
    if (!page.properties) continue;
    const props = page.properties;

    const getTitle = (p: unknown): string => {
      const prop = p as { title?: Array<{ plain_text?: string }> };
      return prop?.title?.[0]?.plain_text ?? "";
    };

    const getSelect = (p: unknown): string => {
      const prop = p as { select?: { name?: string } };
      return prop?.select?.name ?? "";
    };

    const getRichText = (p: unknown): string => {
      const prop = p as { rich_text?: Array<{ plain_text?: string }> };
      return prop?.rich_text?.[0]?.plain_text ?? "";
    };

    const getDate = (p: unknown): Date | undefined => {
      const prop = p as { date?: { start?: string } };
      return prop?.date?.start ? new Date(prop.date.start) : undefined;
    };

    const statusStr = getSelect(props["ステータス"]);
    const statusMap: Record<string, NotionSyncRecord["status"]> = {
      "下書き": "draft",
      "予約済み": "scheduled",
      "投稿済み": "posted",
      "失敗": "failed",
    };

    records.push({
      pageId: page.id as string,
      title: getTitle(props["Name"]),
      platform: getSelect(props["プラットフォーム"]),
      companyName: getSelect(props["会社名"]),
      status: statusMap[statusStr] ?? "draft",
      scheduledAt: getDate(props["予約日時"]),
      postText: getRichText(props["投稿文"]),
      hashtags: getRichText(props["ハッシュタグ"]),
      lastEditedAt: new Date(page.last_edited_time),
    });
  }

  return records;
}
