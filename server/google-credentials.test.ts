import { describe, it, expect } from "vitest";
import { getGbpAuthUrl } from "./gbp";

describe("Google OAuth Credentials", () => {
  it("GOOGLE_CLIENT_ID should be set and have correct format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId, "GOOGLE_CLIENT_ID is not set").toBeTruthy();
    // Google Client IDは通常 numbers-string.apps.googleusercontent.com の形式
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_SECRET should be set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret, "GOOGLE_CLIENT_SECRET is not set").toBeTruthy();
    expect(clientSecret!.length).toBeGreaterThan(0);
  });

  it("getGbpAuthUrl should generate a valid Google OAuth URL with correct client_id", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = "https://sns-auto-klccpgbu.manus.space/api/gbp/oauth/callback";
    const state = "1:1";

    const url = getGbpAuthUrl(clientId, redirectUri, state);

    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain(`client_id=${encodeURIComponent(clientId)}`);
    expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(url).toContain("scope=");
    expect(url).toContain("business.manage");
    expect(url).toContain("response_type=code");
    expect(url).toContain("access_type=offline");
  });

  it("Generated auth URL should be accessible by Google (returns 302 redirect)", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = "https://sns-auto-klccpgbu.manus.space/api/gbp/oauth/callback";
    const state = "1:1";

    const url = getGbpAuthUrl(clientId, redirectUri, state);

    // GoogleのOAuthエンドポイントにリクエストを送り、302リダイレクト（正常）か400エラー（invalid_client）かを確認
    const res = await fetch(url, { redirect: "manual" });
    // 302はGoogleのサインインページへのリダイレクト（正常）
    // 400はinvalid_clientエラー
    expect(res.status, `Expected 302 redirect but got ${res.status}. URL: ${url}`).toBe(302);
  }, 15000);
});
