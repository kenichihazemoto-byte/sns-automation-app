import * as db from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * 投稿リマインダーサービス
 * 予約投稿の30分前に通知を送信
 */

export async function checkAndSendReminders(): Promise<void> {
  try {
    const pendingSchedules = await db.getPendingReminderSchedules();

    if (pendingSchedules.length === 0) {
      console.log("[Reminder] No pending reminders");
      return;
    }

    console.log(`[Reminder] Found ${pendingSchedules.length} pending reminders`);

    for (const schedule of pendingSchedules) {
      try {
        await sendReminder(schedule);
        await db.markReminderSent(schedule.id);
        console.log(`[Reminder] Sent reminder for schedule ${schedule.id}`);
      } catch (error) {
        console.error(`[Reminder] Failed to send reminder for schedule ${schedule.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Reminder] Error checking reminders:", error);
  }
}

async function sendReminder(schedule: any): Promise<void> {
  const scheduledTime = new Date(schedule.scheduledAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = "📢 投稿リマインダー";
  const content = `
予約投稿の時間が近づいています。

**投稿予定時刻**: ${scheduledTime}
**企業名**: ${schedule.companyName}
**投稿タイプ**: ${schedule.isBeforeAfter ? "ビフォーアフター投稿" : "通常投稿"}

投稿内容を確認して、各プラットフォームに投稿してください。
  `.trim();

  const success = await notifyOwner({ title, content });

  if (!success) {
    console.warn(`[Reminder] Failed to send notification for schedule ${schedule.id}`);
  }
}

/**
 * リマインダーチェックを定期的に実行
 * 5分ごとにチェック
 */
export function startReminderService(): void {
  console.log("[Reminder] Starting reminder service");
  
  // 初回実行
  checkAndSendReminders();

  // 5分ごとに実行
  setInterval(() => {
    checkAndSendReminders();
  }, 5 * 60 * 1000);
}
