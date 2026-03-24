/**
 * Google Business Profile (GBP) API ヘルパー
 * OAuth2認証フロー・投稿作成・拠点一覧取得
 *
 * 使用するAPIエンドポイント（2024年以降の最新版）:
 * - アカウント管理: https://mybusinessaccountmanagement.googleapis.com/v1
 * - 拠点情報: https://mybusinessbusinessinformation.googleapis.com/v1
 * - 投稿: https://mybusiness.googleapis.com/v4（投稿はv4が現在も有効）
 */

import { ENV } from "./_core/env";

const GBP_ACCOUNT_API_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const GBP_BUSINESS_INFO_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GBP_POST_API_BASE = "https://mybusiness.googleapis.com/v4";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// GBP APIに必要なOAuth2スコープ
const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

/**
 * Google OAuth2認証URLを生成する
 */
export function getGbpAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GBP_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

/**
 * 認証コードをアクセストークンに交換する
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json();
}

/**
 * リフレッシュトークンでアクセストークンを更新する
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return res.json();
}

/**
 * Account Management API用リクエストヘルパー
 */
async function accountApiFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${GBP_ACCOUNT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GBP API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Business Information API用リクエストヘルパー
 */
async function businessInfoFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${GBP_BUSINESS_INFO_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GBP API error (${res.status}): ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Post API用リクエストヘルパー（v4）
 */
async function postApiFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${GBP_POST_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    // HTMLレスポンス（404ページなど）はユーザー向けのメッセージに変換
    if (errText.trim().startsWith("<")) {
      if (res.status === 404) {
        throw new Error(`GBP APIエラー (404): 指定された拠点またはアカウントが見つかりません。アカウントIDと拠点IDを確認してください。`);
      }
      throw new Error(`GBP APIエラー (${res.status}): Googleサーバーからエラーレスポンスが返ってきました。時間をおいて再試行してください。`);
    }
    // JSONエラーの場合はエラーメッセージを抽出
    try {
      const errJson = JSON.parse(errText);
      const message = errJson?.error?.message ?? errJson?.message ?? errText;
      throw new Error(`GBP APIエラー (${res.status}): ${message}`);
    } catch {
      throw new Error(`GBP APIエラー (${res.status}): ${errText}`);
    }
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * 認証済みユーザーのGBPアカウント一覧を取得する
 * Account Management API v1を使用
 */
export async function listGbpAccounts(
  accessToken: string
): Promise<Array<{ name: string; accountName: string; type: string }>> {
  const data = await accountApiFetch("/accounts", accessToken);
  return data?.accounts ?? [];
}

/**
 * 指定アカウントのロケーション一覧を取得する
 * Business Information API v1を使用
 * parentはaccounts/{accountId}形式（例: accounts/123456789）
 */
export async function listGbpLocations(
  accessToken: string,
  accountId: string
): Promise<Array<{ name: string; title: string; storeCode?: string }>> {
  // readMaskは必須パラメータ（取得するフィールドを指定）
  const params = new URLSearchParams({
    readMask: "name,title,storeCode,storefrontAddress",
    pageSize: "100",
  });
  const data = await businessInfoFetch(
    `/${accountId}/locations?${params.toString()}`,
    accessToken
  );
  return data?.locations ?? [];
}

export interface GbpPostPayload {
  summary: string;
  topicType: "STANDARD" | "EVENT" | "OFFER";
  mediaUrl?: string;
  callToAction?: {
    actionType: "BOOK" | "ORDER" | "SHOP" | "LEARN_MORE" | "SIGN_UP" | "CALL";
    url: string;
  };
  event?: {
    title: string;
    startDate: { year: number; month: number; day: number };
    startTime?: { hours: number; minutes: number; seconds: number; nanos: number };
    endDate: { year: number; month: number; day: number };
    endTime?: { hours: number; minutes: number; seconds: number; nanos: number };
  };
}

/**
 * Googleビジネスプロフィールに投稿を作成する
 * v4 APIを使用: POST /v4/accounts-STAR-SLASH-locs-STAR/localPosts
 *
 * accountId例: "accounts/123456789"
 * locationId例: "accounts/123456789/locs/987654321" (完全パス) または "locs/987654321" (短縮)
 * どちらの形式でも正しく動作するよう正規化する
 */
export async function createGbpPost(
  accessToken: string,
  accountId: string,
  locationId: string,
  payload: GbpPostPayload
): Promise<{ name: string; state: string; createTime: string }> {
  const body: Record<string, any> = {
    languageCode: "ja",
    summary: payload.summary,
    topicType: payload.topicType,
  };

  if (payload.mediaUrl) {
    body.media = [
      {
        mediaFormat: "PHOTO",
        sourceUrl: payload.mediaUrl,
      },
    ];
  }

  if (payload.callToAction) {
    body.callToAction = {
      actionType: payload.callToAction.actionType,
      url: payload.callToAction.url,
    };
  }

  if (payload.topicType === "EVENT" && payload.event) {
    body.event = {
      title: payload.event.title,
      schedule: {
        startDate: payload.event.startDate,
        startTime: payload.event.startTime ?? { hours: 9, minutes: 0, seconds: 0, nanos: 0 },
        endDate: payload.event.endDate,
        endTime: payload.event.endTime ?? { hours: 17, minutes: 0, seconds: 0, nanos: 0 },
      },
    };
  }

  // v4 APIの正しいパス: /v4/accounts/{accountId}/locations/{locationId}/localPosts
  // DBには数字のみ（例: "12365975"）または "accounts/12365975" 形式で保存されている
  // locationIdも数字のみ（例: "14039132526234422237"）または完全パス形式
  let parent: string;
  if (locationId.startsWith("accounts/")) {
    // locationIdが完全パス形式: "accounts/123/locations/456" → そのまま使用
    parent = locationId;
  } else {
    // accountIdを正規化（数字のみの場合は "accounts/" を付与）
    const normalizedAccountId = accountId.startsWith("accounts/")
      ? accountId
      : `accounts/${accountId}`;
    if (locationId.startsWith("locations/")) {
      // locationIdが "locations/456" 形式
      parent = `${normalizedAccountId}/${locationId}`;
    } else {
      // locationIdが数字のみ
      parent = `${normalizedAccountId}/locations/${locationId}`;
    }
  }

  const apiPath = `/${parent}/localPosts`;
  console.log(`[GBP] createGbpPost called: accountId=${accountId}, locationId=${locationId}`);
  console.log(`[GBP] Resolved API path: ${apiPath}`);
  const result = await postApiFetch(
    apiPath,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return result;
}

/**
 * GBP投稿を削除する
 */
export async function deleteGbpPost(
  accessToken: string,
  postName: string
): Promise<void> {
  await postApiFetch(`/${postName}`, accessToken, { method: "DELETE" });
}
