/**
 * SNS API連携サービス
 * Instagram Graph API、X API、Threads APIとの連携を管理
 */

// Instagram Graph API連携
export interface InstagramCredentials {
  accessToken: string;
  instagramBusinessAccountId: string;
}

export interface InstagramPostResult {
  id: string;
  permalink: string;
}

/**
 * Instagram Graph APIを使用して画像を投稿
 * 
 * 手順:
 * 1. メディアコンテナを作成（画像URLとキャプションを指定）
 * 2. コンテナIDを使用して投稿を公開
 * 
 * 参考: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
export async function postToInstagram(params: {
  credentials: InstagramCredentials;
  imageUrl: string;
  caption: string;
}): Promise<InstagramPostResult> {
  const { credentials, imageUrl, caption } = params;
  
  try {
    // Step 1: メディアコンテナを作成
    const containerResponse = await fetch(
      `https://graph.facebook.com/v21.0/${credentials.instagramBusinessAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: credentials.accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Instagram container creation failed: ${JSON.stringify(error)}`);
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // Step 2: メディアコンテナを公開
    const publishResponse = await fetch(
      `https://graph.facebook.com/v21.0/${credentials.instagramBusinessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: credentials.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Instagram publish failed: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json();
    
    // 投稿のパーマリンクを取得
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${publishData.id}?fields=permalink&access_token=${credentials.accessToken}`
    );
    
    const mediaData = await mediaResponse.json();

    return {
      id: publishData.id,
      permalink: mediaData.permalink || '',
    };
  } catch (error) {
    console.error('Instagram posting error:', error);
    throw error;
  }
}

// X (Twitter) API連携
export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface XPostResult {
  id: string;
  url: string;
}

/**
 * X APIを使用してツイートを投稿
 * 
 * OAuth 1.0a認証を使用
 * 参考: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */
export async function postToX(params: {
  credentials: XCredentials;
  text: string;
  mediaIds?: string[];
}): Promise<XPostResult> {
  const { credentials, text, mediaIds } = params;

  try {
    // OAuth 1.0a署名を生成（簡略版 - 実際の実装ではライブラリを使用）
    const oauth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauthClient = oauth({
      consumer: {
        key: credentials.apiKey,
        secret: credentials.apiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const requestData = {
      url: 'https://api.twitter.com/2/tweets',
      method: 'POST',
    };

    const token = {
      key: credentials.accessToken,
      secret: credentials.accessTokenSecret,
    };

    const authHeader = oauthClient.toHeader(oauthClient.authorize(requestData, token));

    const tweetData: any = { text };
    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds };
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`X posting failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    
    return {
      id: data.data.id,
      url: `https://twitter.com/i/web/status/${data.data.id}`,
    };
  } catch (error) {
    console.error('X posting error:', error);
    throw error;
  }
}

/**
 * X APIを使用して画像をアップロード
 */
export async function uploadMediaToX(params: {
  credentials: XCredentials;
  imageUrl: string;
}): Promise<string> {
  const { credentials, imageUrl } = params;

  try {
    // 画像をダウンロード
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // OAuth 1.0a署名を生成
    const oauth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauthClient = oauth({
      consumer: {
        key: credentials.apiKey,
        secret: credentials.apiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    const requestData = {
      url: 'https://upload.twitter.com/1.1/media/upload.json',
      method: 'POST',
    };

    const token = {
      key: credentials.accessToken,
      secret: credentials.accessTokenSecret,
    };

    const authHeader = oauthClient.toHeader(oauthClient.authorize(requestData, token));

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('media', Buffer.from(imageBuffer));

    const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        ...authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`X media upload failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.media_id_string;
  } catch (error) {
    console.error('X media upload error:', error);
    throw error;
  }
}

// Threads API連携
export interface ThreadsCredentials {
  accessToken: string;
  threadsUserId: string;
}

export interface ThreadsPostResult {
  id: string;
  permalink: string;
}

/**
 * Threads APIを使用して投稿
 * 
 * 手順:
 * 1. メディアコンテナを作成
 * 2. コンテナIDを使用して投稿を公開
 * 
 * 参考: https://developers.facebook.com/docs/threads/posts
 */
export async function postToThreads(params: {
  credentials: ThreadsCredentials;
  text: string;
  imageUrl?: string;
}): Promise<ThreadsPostResult> {
  const { credentials, text, imageUrl } = params;

  try {
    // Step 1: メディアコンテナを作成
    const containerParams: any = {
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
      text: text,
      access_token: credentials.accessToken,
    };

    if (imageUrl) {
      containerParams.image_url = imageUrl;
    }

    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${credentials.threadsUserId}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(containerParams),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Threads container creation failed: ${JSON.stringify(error)}`);
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // Step 2: メディアコンテナを公開
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${credentials.threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: credentials.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Threads publish failed: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json();

    // 投稿のパーマリンクを取得
    const mediaResponse = await fetch(
      `https://graph.threads.net/v1.0/${publishData.id}?fields=permalink&access_token=${credentials.accessToken}`
    );

    const mediaData = await mediaResponse.json();

    return {
      id: publishData.id,
      permalink: mediaData.permalink || '',
    };
  } catch (error) {
    console.error('Threads posting error:', error);
    throw error;
  }
}

/**
 * SNS投稿を一括実行
 */
export async function postToAllPlatforms(params: {
  platforms: {
    instagram?: {
      credentials: InstagramCredentials;
      caption: string;
    };
    x?: {
      credentials: XCredentials;
      text: string;
    };
    threads?: {
      credentials: ThreadsCredentials;
      text: string;
    };
  };
  imageUrl: string;
}): Promise<{
  instagram?: InstagramPostResult;
  x?: XPostResult;
  threads?: ThreadsPostResult;
  errors?: { platform: string; error: string }[];
}> {
  const { platforms, imageUrl } = params;
  const results: any = {};
  const errors: { platform: string; error: string }[] = [];

  // Instagram
  if (platforms.instagram) {
    try {
      results.instagram = await postToInstagram({
        credentials: platforms.instagram.credentials,
        imageUrl,
        caption: platforms.instagram.caption,
      });
    } catch (error: any) {
      errors.push({ platform: 'instagram', error: error.message });
    }
  }

  // X (Twitter)
  if (platforms.x) {
    try {
      // まず画像をアップロード
      const mediaId = await uploadMediaToX({
        credentials: platforms.x.credentials,
        imageUrl,
      });

      // ツイートを投稿
      results.x = await postToX({
        credentials: platforms.x.credentials,
        text: platforms.x.text,
        mediaIds: [mediaId],
      });
    } catch (error: any) {
      errors.push({ platform: 'x', error: error.message });
    }
  }

  // Threads
  if (platforms.threads) {
    try {
      results.threads = await postToThreads({
        credentials: platforms.threads.credentials,
        text: platforms.threads.text,
        imageUrl,
      });
    } catch (error: any) {
      errors.push({ platform: 'threads', error: error.message });
    }
  }

  if (errors.length > 0) {
    results.errors = errors;
  }

  return results;
}
