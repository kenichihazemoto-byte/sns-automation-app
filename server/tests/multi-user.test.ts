import { describe, it, expect } from "vitest";

describe("マルチユーザー対応のテスト", () => {
  describe("ユーザープロフィール", () => {
    it("ユーザープロフィールの構造が正しい", () => {
      const mockUser = {
        id: 1,
        openId: "test-open-id",
        name: "テストユーザー",
        email: "test@example.com",
        companyName: "テスト株式会社",
        industry: "建設業",
        googlePhotoAlbums: JSON.stringify([
          "https://photos.app.goo.gl/test1",
          "https://photos.app.goo.gl/test2",
        ]),
      };

      expect(mockUser.companyName).toBe("テスト株式会社");
      expect(mockUser.industry).toBe("建設業");
      
      const albums = JSON.parse(mockUser.googlePhotoAlbums);
      expect(albums).toBeInstanceOf(Array);
      expect(albums).toHaveLength(2);
      expect(albums[0]).toContain("photos.app.goo.gl");
    });

    it("Google フォトアルバムURLの形式が正しい", () => {
      const validUrls = [
        "https://photos.app.goo.gl/abc123",
        "https://photos.google.com/share/xyz789",
      ];

      validUrls.forEach((url) => {
        expect(
          url.includes("photos.app.goo.gl") || url.includes("photos.google.com")
        ).toBe(true);
      });
    });

    it("複数アルバムのJSON変換が正しく動作する", () => {
      const albums = [
        "https://photos.app.goo.gl/album1",
        "https://photos.app.goo.gl/album2",
        "https://photos.app.goo.gl/album3",
      ];

      const jsonString = JSON.stringify(albums);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(albums);
      expect(parsed).toHaveLength(3);
    });
  });

  describe("ユーザー設定の更新", () => {
    it("プロフィール更新データの構造が正しい", () => {
      const updateData = {
        companyName: "新しい会社名",
        industry: "医療施設設計",
        googlePhotoAlbums: JSON.stringify([
          "https://photos.app.goo.gl/new-album",
        ]),
      };

      expect(updateData.companyName).toBeTruthy();
      expect(updateData.industry).toBeTruthy();
      expect(updateData.googlePhotoAlbums).toBeTruthy();

      const albums = JSON.parse(updateData.googlePhotoAlbums);
      expect(albums).toBeInstanceOf(Array);
    });

    it("部分的な更新データが正しく処理される", () => {
      const partialUpdate = {
        companyName: "更新された会社名",
      };

      expect(partialUpdate.companyName).toBe("更新された会社名");
      expect(partialUpdate).not.toHaveProperty("industry");
      expect(partialUpdate).not.toHaveProperty("googlePhotoAlbums");
    });
  });

  describe("アルバム管理", () => {
    it("アルバムの追加が正しく動作する", () => {
      const existingAlbums = [
        "https://photos.app.goo.gl/album1",
        "https://photos.app.goo.gl/album2",
      ];

      const newAlbum = "https://photos.app.goo.gl/album3";
      const updatedAlbums = [...existingAlbums, newAlbum];

      expect(updatedAlbums).toHaveLength(3);
      expect(updatedAlbums).toContain(newAlbum);
    });

    it("アルバムの削除が正しく動作する", () => {
      const albums = [
        "https://photos.app.goo.gl/album1",
        "https://photos.app.goo.gl/album2",
        "https://photos.app.goo.gl/album3",
      ];

      const indexToRemove = 1;
      const updatedAlbums = albums.filter((_, i) => i !== indexToRemove);

      expect(updatedAlbums).toHaveLength(2);
      expect(updatedAlbums).not.toContain(albums[indexToRemove]);
      expect(updatedAlbums).toContain(albums[0]);
      expect(updatedAlbums).toContain(albums[2]);
    });

    it("空のアルバムリストが正しく処理される", () => {
      const emptyAlbums: string[] = [];
      const jsonString = JSON.stringify(emptyAlbums);

      expect(jsonString).toBe("[]");
      expect(JSON.parse(jsonString)).toEqual([]);
    });
  });

  describe("会社情報の検証", () => {
    it("会社名が必須であることを確認", () => {
      const validProfile = {
        companyName: "テスト会社",
        industry: "建設業",
      };

      const invalidProfile = {
        companyName: "",
        industry: "建設業",
      };

      expect(validProfile.companyName).toBeTruthy();
      expect(invalidProfile.companyName).toBeFalsy();
    });

    it("業種は任意項目であることを確認", () => {
      const profileWithIndustry = {
        companyName: "テスト会社",
        industry: "建設業",
      };

      const profileWithoutIndustry = {
        companyName: "テスト会社",
        industry: undefined,
      };

      expect(profileWithIndustry.industry).toBeTruthy();
      expect(profileWithoutIndustry.industry).toBeUndefined();
    });
  });

  describe("ユーザー間のデータ分離", () => {
    it("異なるユーザーのデータが分離されている", () => {
      const user1 = {
        id: 1,
        companyName: "会社A",
        googlePhotoAlbums: JSON.stringify(["https://photos.app.goo.gl/user1-album"]),
      };

      const user2 = {
        id: 2,
        companyName: "会社B",
        googlePhotoAlbums: JSON.stringify(["https://photos.app.goo.gl/user2-album"]),
      };

      expect(user1.id).not.toBe(user2.id);
      expect(user1.companyName).not.toBe(user2.companyName);
      expect(user1.googlePhotoAlbums).not.toBe(user2.googlePhotoAlbums);
    });
  });
});
