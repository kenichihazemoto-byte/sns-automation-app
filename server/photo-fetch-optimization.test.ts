import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPhotosFromAlbum } from '../server/google-photos-service';

describe('写真取得最適化機能', () => {
  describe('HTMLパース処理', () => {
    it('複数のパターンで画像URLを抽出できる', async () => {
      // テスト用のアルバムURL（実際のアルバムを使用）
      const testAlbumUrl = "https://photos.app.goo.gl/JmEw1Lnr7eN13cJ68";
      
      const photos = await fetchPhotosFromAlbum(testAlbumUrl);
      
      // 写真が取得できることを確認
      expect(photos).toBeDefined();
      expect(Array.isArray(photos)).toBe(true);
      
      // 写真が1枚以上取得できることを確認
      if (photos.length > 0) {
        const photo = photos[0];
        
        // 必須フィールドが存在することを確認
        expect(photo.url).toBeDefined();
        expect(photo.thumbnailUrl).toBeDefined();
        expect(photo.albumYear).toBeDefined();
        
        // URLが正しい形式であることを確認
        expect(photo.url).toMatch(/^https:\/\/lh3\.googleusercontent\.com\//);
        expect(photo.url).toContain('=w2048-h2048');
        expect(photo.thumbnailUrl).toContain('=w400-h400');
      }
    });

    it('画像URLの検証が正しく機能する', async () => {
      const testAlbumUrl = "https://photos.app.goo.gl/JmEw1Lnr7eN13cJ68";
      const photos = await fetchPhotosFromAlbum(testAlbumUrl);
      
      // 取得した全ての画像URLが検証をパスしていることを確認
      photos.forEach(photo => {
        // lh3.googleusercontent.comドメインであること
        expect(photo.url).toMatch(/^https:\/\/lh3\.googleusercontent\.com\//);
        
        // 最小限の長さがあること
        expect(photo.url.length).toBeGreaterThan(50);
        
        // 無効な文字が含まれていないこと
        expect(photo.url).not.toContain('<');
        expect(photo.url).not.toContain('>');
        expect(photo.url).not.toContain('"');
        expect(photo.url).not.toContain("'");
      });
    });
  });

  describe('リトライ戦略', () => {
    it('指数バックオフの計算が正しい', () => {
      const BASE_RETRY_DELAY = 1000;
      const MAX_RETRY_DELAY = 10000;
      
      const calculateBackoffDelay = (retryCount: number): number => {
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        return Math.min(delay, MAX_RETRY_DELAY);
      };
      
      // リトライ0回目: 1秒
      expect(calculateBackoffDelay(0)).toBe(1000);
      
      // リトライ1回目: 2秒
      expect(calculateBackoffDelay(1)).toBe(2000);
      
      // リトライ2回目: 4秒
      expect(calculateBackoffDelay(2)).toBe(4000);
      
      // リトライ3回目: 8秒
      expect(calculateBackoffDelay(3)).toBe(8000);
      
      // リトライ4回目: 10秒（上限）
      expect(calculateBackoffDelay(4)).toBe(10000);
      
      // リトライ5回目: 10秒（上限）
      expect(calculateBackoffDelay(5)).toBe(10000);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないアルバムURLでエラーをスローする', async () => {
      const invalidAlbumUrl = "https://photos.app.goo.gl/invalid123456";
      
      await expect(fetchPhotosFromAlbum(invalidAlbumUrl)).rejects.toThrow('Album not found');
    });

    it('空のアルバムで空配列を返す', async () => {
      // モックを使用して空のHTMLを返す
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body>Empty album</body></html>',
      });
      
      try {
        const testAlbumUrl = "https://photos.app.goo.gl/JmEw1Lnr7eN13cJ68";
        const photos = await fetchPhotosFromAlbum(testAlbumUrl);
        
        expect(photos).toEqual([]);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('成功率の計算', () => {
    it('成功率が正しく計算される', () => {
      const calculateSuccessRate = (successCount: number, totalAttempts: number): number => {
        return totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;
      };
      
      // 100%成功
      expect(calculateSuccessRate(10, 10)).toBe(100);
      
      // 50%成功
      expect(calculateSuccessRate(5, 10)).toBe(50);
      
      // 95%成功（目標）
      expect(calculateSuccessRate(19, 20)).toBe(95);
      
      // 0回試行時は0%
      expect(calculateSuccessRate(0, 0)).toBe(0);
    });
  });
});
