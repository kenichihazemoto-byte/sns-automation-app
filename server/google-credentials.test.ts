import { describe, it, expect } from "vitest";

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
});
