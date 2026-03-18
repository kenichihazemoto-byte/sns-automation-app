import { getPendingGbpScheduledPosts, updateGbpScheduledPostStatus } from "./db";
import { createGbpPost, refreshAccessToken, GbpPostPayload } from "./gbp";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 期限を過ぎたGBP予約投稿を実行する
 */
async function processPendingGbpPosts(): Promise<void> {
  let pendingPosts: Awaited<ReturnType<typeof getPendingGbpScheduledPosts>>;

  try {
    pendingPosts = await getPendingGbpScheduledPosts();
  } catch (e) {
    console.warn("[GbpScheduler] Failed to fetch pending posts:", e);
    return;
  }

  if (pendingPosts.length === 0) return;

  console.log(`[GbpScheduler] Processing ${pendingPosts.length} pending GBP post(s)`);

  for (const post of pendingPosts) {
    try {
      // ステータスを processing に変更（二重実行防止）
      await updateGbpScheduledPostStatus(post.id, "published"); // 先にロック

      if (!post.accessToken || !post.accountId || !post.locationId) {
        throw new Error("GBP account credentials not found");
      }

      // アクセストークンを更新（期限切れ対策）
      let accessToken = post.accessToken;
      const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
      if (post.refreshToken && clientId && clientSecret) {
        try {
          const refreshed = await refreshAccessToken(post.refreshToken, clientId, clientSecret);
          accessToken = refreshed.access_token;
        } catch (refreshErr) {
          console.warn(`[GbpScheduler] Token refresh failed for post ${post.id}, using existing token`);
        }
      }

      // GBP APIペイロードを構築
      const payload: GbpPostPayload = {
        topicType: post.topicType as "STANDARD" | "EVENT" | "OFFER",
        summary: post.summary,
        mediaUrl: post.mediaUrl ?? undefined,
        callToAction: post.callToActionType
          ? {
              actionType: post.callToActionType as GbpPostPayload["callToAction"] extends undefined ? never : NonNullable<GbpPostPayload["callToAction"]>["actionType"],
              url: post.callToActionUrl ?? "",
            }
          : undefined,
      };

      // イベント情報を追加
      if (post.topicType === "EVENT" && post.eventTitle && post.eventStartAt && post.eventEndAt) {
        const startDate = new Date(post.eventStartAt);
        const endDate = new Date(post.eventEndAt);
        payload.event = {
          title: post.eventTitle,
          startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
          },
          endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate(),
          },
        };
      }

      // GBP APIに投稿
      const result = await createGbpPost(
        accessToken,
        post.accountId,
        post.locationId,
        payload
      );

      console.log(`[GbpScheduler] Post ${post.id} published successfully: ${result.name}`);
    } catch (err: any) {
      // 失敗時：ステータスを failed に更新
      const errorMessage = err?.message ?? String(err);
      console.error(`[GbpScheduler] Post ${post.id} failed:`, errorMessage);
      try {
        await updateGbpScheduledPostStatus(post.id, "failed", undefined, errorMessage);
      } catch (updateErr) {
        console.error(`[GbpScheduler] Failed to update status for post ${post.id}:`, updateErr);
      }
    }
  }
}

/**
 * GBP予約投稿の自動実行エンジンを起動する（5分ごと）
 */
export function startGbpScheduler(): void {
  if (schedulerInterval) {
    console.log("[GbpScheduler] Already running");
    return;
  }

  const INTERVAL_MS = 5 * 60 * 1000; // 5分

  // 起動時に1回即時実行
  processPendingGbpPosts().catch(e =>
    console.warn("[GbpScheduler] Initial run failed:", e)
  );

  schedulerInterval = setInterval(() => {
    processPendingGbpPosts().catch(e =>
      console.warn("[GbpScheduler] Interval run failed:", e)
    );
  }, INTERVAL_MS);

  console.log(`[GbpScheduler] Started. Checking every ${INTERVAL_MS / 1000 / 60} minutes`);
}

/**
 * GBP予約投稿の自動実行エンジンを停止する
 */
export function stopGbpScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[GbpScheduler] Stopped");
  }
}
