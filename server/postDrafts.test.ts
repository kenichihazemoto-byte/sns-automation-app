import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

// テスト用のコンテキストを作成
function createTestContext(userId: number) {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      name: "Test User",
      email: "test@example.com",
      role: "user" as const,
    },
    req: {} as any,
    res: {} as any,
  };
}

describe('Post Drafts API', () => {
  let testDraftId: number = 0;
  const testUserId = 999999; // テスト用のユーザーID

  // テスト後にクリーンアップ
  afterAll(async () => {
    if (testDraftId && testDraftId > 0) {
      try {
        await db.deletePostDraft(testDraftId, testUserId);
      } catch (error) {
        // クリーンアップエラーは無視
      }
    }
  });

  it('should create a new draft', async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.postDrafts.create({
      companyName: "ハゼモト建設",
      title: "テスト下書き",
      isBeforeAfter: false,
      imageUrl: "https://example.com/test.jpg",
      instagramContent: "テスト投稿内容",
      instagramHashtags: "#テスト #下書き",
      xContent: "X用のテスト投稿",
      xHashtags: "#test",
      threadsContent: "Threads用のテスト投稿",
      threadsHashtags: "#threads",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
    testDraftId = result.id;
  });

  it('should get a draft by id', async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const draft = await caller.postDrafts.get({ id: testDraftId });

    expect(draft).toBeDefined();
    expect(draft?.title).toBe("テスト下書き");
    expect(draft?.companyName).toBe("ハゼモト建設");
    expect(draft?.instagramContent).toBe("テスト投稿内容");
  });

  it('should list all drafts for user', async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const drafts = await caller.postDrafts.list();

    expect(Array.isArray(drafts)).toBe(true);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.some(d => d.id === testDraftId)).toBe(true);
  });

  it('should update a draft', async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.postDrafts.update({
      id: testDraftId,
      title: "更新されたテスト下書き",
      instagramContent: "更新された投稿内容",
    });

    expect(result.success).toBe(true);

    // 更新を確認
    const draft = await caller.postDrafts.get({ id: testDraftId });
    expect(draft?.title).toBe("更新されたテスト下書き");
    expect(draft?.instagramContent).toBe("更新された投稿内容");
  });

  it('should delete a draft', async () => {
    // 削除用の新しい下書きを作成
    const caller = appRouter.createCaller(createTestContext(testUserId));
    const createResult = await caller.postDrafts.create({
      companyName: "ハゼモト建設",
      title: "削除テスト用",
      isBeforeAfter: false,
      instagramContent: "削除テスト",
    });
    const deleteId = createResult.id;

    const result = await caller.postDrafts.delete({ id: deleteId });

    expect(result.success).toBe(true);

    // 削除を確認
    const draft = await caller.postDrafts.get({ id: deleteId });
    expect(draft).toBeUndefined();
  });

  it('should create a before-after draft', async () => {
    const caller = appRouter.createCaller(createTestContext(testUserId));

    const result = await caller.postDrafts.create({
      companyName: "クリニックアーキプロ",
      title: "ビフォーアフター下書き",
      isBeforeAfter: true,
      beforeImageUrl: "https://example.com/before.jpg",
      afterImageUrl: "https://example.com/after.jpg",
      instagramContent: "ビフォーアフター投稿",
      instagramHashtags: "#beforeafter",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);

    // 作成された下書きを確認
    const draft = await caller.postDrafts.get({ id: result.id });
    expect(draft?.isBeforeAfter).toBe(true);
    expect(draft?.beforeImageUrl).toBe("https://example.com/before.jpg");
    expect(draft?.afterImageUrl).toBe("https://example.com/after.jpg");

    // クリーンアップ
    await caller.postDrafts.delete({ id: result.id });
  });
});
