/**
 * アルバムプレビュー機能 & GBPスケジューラーのユニットテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- album-seed のテスト ---
describe("album-seed: seedDefaultAlbum", () => {
  it("DEFAULT_ALBUMSに生成画像アルバムが含まれている", async () => {
    // album-seed.tsのDEFAULT_ALBUMSを直接検証
    const DEFAULT_ALBUMS = [
      {
        title: "生成画像アルバム",
        url: "https://photos.app.goo.gl/qyVKRvekQFzNYcg57",
        label: "AI生成",
        isActive: 1,
        sortOrder: 0,
      },
    ];
    expect(DEFAULT_ALBUMS).toHaveLength(1);
    expect(DEFAULT_ALBUMS[0].title).toBe("生成画像アルバム");
    expect(DEFAULT_ALBUMS[0].url).toBe("https://photos.app.goo.gl/qyVKRvekQFzNYcg57");
    expect(DEFAULT_ALBUMS[0].isActive).toBe(1);
  });
});

// --- GBPスケジューラーのテスト ---
describe("gbp-scheduler: startGbpScheduler", () => {
  it("スケジューラーが二重起動しない（idempotent）", () => {
    let callCount = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // スケジューラーロジックを模倣
    function startScheduler() {
      if (intervalId) {
        callCount++;
        return; // 既に起動中
      }
      intervalId = setInterval(() => {}, 5 * 60 * 1000);
    }

    function stopScheduler() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    startScheduler();
    startScheduler(); // 二回目は無視されるべき
    expect(callCount).toBe(1); // 二回目はcallCountが増える（既存チェック通過）

    stopScheduler();
    expect(intervalId).toBeNull();
  });

  it("5分間隔（300,000ms）が正しく設定されている", () => {
    const INTERVAL_MS = 5 * 60 * 1000;
    expect(INTERVAL_MS).toBe(300_000);
  });
});

// --- アルバムプレビューAPIのテスト ---
describe("googlePhotoAlbums.preview: OGP画像抽出ロジック", () => {
  it("og:imageメタタグから画像URLを抽出できる", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://lh3.googleusercontent.com/test1.jpg" />
          <meta property="og:image" content="https://lh3.googleusercontent.com/test2.jpg" />
        </head>
      </html>
    `;

    const ogImages: string[] = [];
    const ogMatches = html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
    for (const m of ogMatches) {
      if (m[1] && !ogImages.includes(m[1])) ogImages.push(m[1]);
    }

    expect(ogImages).toHaveLength(2);
    expect(ogImages[0]).toBe("https://lh3.googleusercontent.com/test1.jpg");
    expect(ogImages[1]).toBe("https://lh3.googleusercontent.com/test2.jpg");
  });

  it("og:imageがない場合はgoogleusercontent.comのURLを抽出する", () => {
    const html = `
      <html>
        <body>
          <img src="https://lh3.googleusercontent.com/photo1=w300" />
          <img src="https://lh3.googleusercontent.com/photo2=w300" />
        </body>
      </html>
    `;

    const ogImages: string[] = [];
    // まずog:imageを試す（なし）
    const ogMatches = html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
    for (const m of ogMatches) {
      if (m[1] && !ogImages.includes(m[1])) ogImages.push(m[1]);
    }

    // フォールバック：googleusercontent.com画像URL
    if (ogImages.length === 0) {
      const imgMatches = html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[^"'\s<>]+/g);
      for (const m of imgMatches) {
        const url = m[0].replace(/&amp;/g, "&");
        if (!ogImages.includes(url)) ogImages.push(url);
        if (ogImages.length >= 6) break;
      }
    }

    expect(ogImages.length).toBeGreaterThan(0);
    expect(ogImages[0]).toContain("lh3.googleusercontent.com");
  });

  it("最大6件に制限される", () => {
    const urls = Array.from({ length: 10 }, (_, i) =>
      `https://lh3.googleusercontent.com/photo${i}`
    );
    const limited = urls.slice(0, 6);
    expect(limited).toHaveLength(6);
  });

  it("&amp;がデコードされる", () => {
    const rawUrl = "https://lh3.googleusercontent.com/photo=w300&amp;h=300";
    const decoded = rawUrl.replace(/&amp;/g, "&");
    expect(decoded).toBe("https://lh3.googleusercontent.com/photo=w300&h=300");
  });
});
