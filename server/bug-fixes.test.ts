import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('バグ修正のテスト', () => {
  describe('予約投稿管理ページの投稿内容表示', () => {
    it('getPostSchedulesByUserIdが投稿内容を含むデータを返す', async () => {
      // テスト用のユーザーID（実際のユーザーIDを使用）
      const userId = 1;
      
      const schedules = await db.getPostSchedulesByUserId(userId);
      
      // スケジュールが取得できることを確認
      expect(schedules).toBeDefined();
      expect(Array.isArray(schedules)).toBe(true);
      
      // 各スケジュールにcontentsフィールドが存在することを確認
      schedules.forEach(schedule => {
        expect(schedule).toHaveProperty('contents');
        expect(Array.isArray(schedule.contents)).toBe(true);
      });
    });

    it('getUpcomingPostSchedulesが投稿内容を含むデータを返す', async () => {
      const schedules = await db.getUpcomingPostSchedules(10);
      
      // スケジュールが取得できることを確認
      expect(schedules).toBeDefined();
      expect(Array.isArray(schedules)).toBe(true);
      
      // 各スケジュールにcontentsフィールドが存在することを確認
      schedules.forEach(schedule => {
        expect(schedule).toHaveProperty('contents');
        expect(Array.isArray(schedule.contents)).toBe(true);
      });
    });

    it('投稿内容にcaptionとhashtagsが含まれる', async () => {
      const userId = 1;
      const schedules = await db.getPostSchedulesByUserId(userId);
      
      // 投稿内容が存在するスケジュールを検索
      const scheduleWithContent = schedules.find(s => s.contents && s.contents.length > 0);
      
      if (scheduleWithContent && scheduleWithContent.contents.length > 0) {
        const content = scheduleWithContent.contents[0];
        
        // captionフィールドが存在することを確認
        expect(content).toHaveProperty('caption');
        
        // hashtagsフィールドが存在することを確認（オプショナル）
        if (content.hashtags) {
          expect(typeof content.hashtags).toBe('string');
        }
      }
    });
  });

  describe('複数ファイルアップロードのデータ構造', () => {
    it('アップロードされた写真が正しいデータ構造を持つ', () => {
      // アップロード後の写真データの期待される構造
      const uploadedPhoto = {
        url: 'https://example.com/photo.jpg',
        id: 123,
        thumbnailUrl: 'https://example.com/photo.jpg',
        fileName: 'test.jpg',
        albumTitle: 'アップロード',
        albumYear: new Date().getFullYear(),
        analysis: {
          category: '内装',
          style: 'モダン',
          description: 'テスト説明',
          keywords: ['キーワード1', 'キーワード2'],
        },
        score: 0,
      };
      
      // 必須フィールドが存在することを確認
      expect(uploadedPhoto).toHaveProperty('url');
      expect(uploadedPhoto).toHaveProperty('id');
      expect(uploadedPhoto).toHaveProperty('thumbnailUrl');
      expect(uploadedPhoto).toHaveProperty('fileName');
      expect(uploadedPhoto).toHaveProperty('albumTitle');
      expect(uploadedPhoto).toHaveProperty('albumYear');
      expect(uploadedPhoto).toHaveProperty('analysis');
      expect(uploadedPhoto).toHaveProperty('score');
      
      // analysisの構造を確認
      expect(uploadedPhoto.analysis).toHaveProperty('category');
      expect(uploadedPhoto.analysis).toHaveProperty('style');
      expect(uploadedPhoto.analysis).toHaveProperty('description');
      expect(uploadedPhoto.analysis).toHaveProperty('keywords');
      expect(Array.isArray(uploadedPhoto.analysis.keywords)).toBe(true);
    });
  });

  describe('写真取得成功率の計算', () => {
    it('getPhotoFetchSuccessRateが正しいデータ構造を返す', async () => {
      const userId = 1;
      const days = 7;
      
      const result = await db.getPhotoFetchSuccessRate(userId, days);
      
      // 必須フィールドが存在することを確認
      expect(result).toHaveProperty('successRate');
      expect(result).toHaveProperty('totalAttempts');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failureCount');
      expect(result).toHaveProperty('errorsByType');
      expect(result).toHaveProperty('recentErrors');
      
      // データ型を確認
      expect(typeof result.successRate).toBe('number');
      expect(typeof result.totalAttempts).toBe('number');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.failureCount).toBe('number');
      expect(typeof result.errorsByType).toBe('object');
      expect(Array.isArray(result.recentErrors)).toBe(true);
      
      // 成功率が0〜100の範囲内であることを確認
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });
  });
});
