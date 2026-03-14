/**
 * 就労支援B型「未来のとびら」月2回定期投稿スケジュール登録スクリプト
 *
 * スケジュール設計:
 *   第1週 水曜日 → 活動紹介 or 成果・達成報告（交互）
 *   第3週 水曜日 → 手工芸作品販売告知 or 利用者募集（交互）
 *
 * 対象期間: 2026年4月〜2026年9月（6ヶ月・12投稿）
 * 投稿時間: 12:00（昼休み帯）
 * 対象ユーザーID: 1（オーナー）
 */

import mysql from 'mysql2/promise';

const USER_ID = 1;
const COMPANY_NAME = 'ハゼモト建設';

// 就労支援B型テンプレートID（DBから確認済み）
const TEMPLATES = {
  activity:    { id: 90005,  name: '就労支援B型：活動紹介' },
  achievement: { id: 90006,  name: '就労支援B型：成果・達成報告' },
  recruitment: { id: 120016, name: '就労支援B型：利用者募集' },
  craftSales:  { id: 120024, name: '就労支援B型：手工芸作品 販売告知' },
};

/**
 * 指定した年月の「第N週の曜日」の日付を返す
 * @param {number} year
 * @param {number} month - 0-indexed (0=Jan)
 * @param {number} weekNum - 1-indexed (1=第1週)
 * @param {number} dayOfWeek - 0=Sun, 3=Wed
 */
function getNthWeekday(year, month, weekNum, dayOfWeek) {
  // 月初の曜日を取得
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  // 最初の対象曜日の日付
  let offset = dayOfWeek - firstDayOfWeek;
  if (offset < 0) offset += 7;
  const firstTarget = 1 + offset;
  // N週目
  const targetDate = firstTarget + (weekNum - 1) * 7;
  return new Date(year, month, targetDate, 12, 0, 0); // 12:00
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // テンプレートのキャプション・ハッシュタグを取得
  const templateIds = Object.values(TEMPLATES).map(t => t.id);
  const [templateRows] = await conn.query(
    `SELECT id, name, instagramCaption, instagramHashtags, xCaption, xHashtags, threadsCaption, threadsHashtags
     FROM post_templates WHERE id IN (${templateIds.join(',')})`,
  );
  const templateMap = {};
  for (const row of templateRows) {
    templateMap[row.id] = row;
  }

  // 2026年4月〜9月のスケジュールを生成
  // 第1週水曜: 活動紹介 / 成果報告 を交互
  // 第3週水曜: 手工芸販売 / 利用者募集 を交互
  const schedules = [];

  for (let m = 3; m <= 8; m++) { // 0-indexed: 3=Apr, 8=Sep
    const year = 2026;
    const monthIndex = m - 3; // 0〜5

    // 第1週水曜（3=Wednesday）
    const week1Date = getNthWeekday(year, m, 1, 3);
    const week1Template = monthIndex % 2 === 0 ? TEMPLATES.activity : TEMPLATES.achievement;
    schedules.push({ date: week1Date, template: week1Template });

    // 第3週水曜
    const week3Date = getNthWeekday(year, m, 3, 3);
    const week3Template = monthIndex % 2 === 0 ? TEMPLATES.craftSales : TEMPLATES.recruitment;
    schedules.push({ date: week3Date, template: week3Template });
  }

  console.log(`\n就労支援B型 月2回定期投稿スケジュール（${schedules.length}件）\n`);
  schedules.forEach(s => {
    const d = s.date;
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    console.log(`  ${dateStr}  ${s.template.name}`);
  });
  console.log('');

  let insertedCount = 0;

  for (const { date, template } of schedules) {
    const tmpl = templateMap[template.id];
    if (!tmpl) {
      console.warn(`テンプレートが見つかりません: id=${template.id}`);
      continue;
    }

    // post_schedules に登録
    const [schedResult] = await conn.query(
      `INSERT INTO post_schedules (userId, companyName, scheduledAt, status, isBeforeAfter, createdAt, updatedAt)
       VALUES (?, ?, ?, 'scheduled', 0, NOW(), NOW())`,
      [USER_ID, COMPANY_NAME, date],
    );
    const scheduleId = schedResult.insertId;

    // post_contents に Instagram / X / Threads の3プラットフォーム分を登録
    const platforms = [
      { platform: 'instagram', caption: tmpl.instagramCaption, hashtags: tmpl.instagramHashtags },
      { platform: 'x',         caption: tmpl.xCaption,         hashtags: tmpl.xHashtags },
      { platform: 'threads',   caption: tmpl.threadsCaption,   hashtags: tmpl.threadsHashtags },
    ];

    for (const p of platforms) {
      if (!p.caption) continue;
      await conn.query(
        `INSERT INTO post_contents (postScheduleId, platform, caption, hashtags, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [scheduleId, p.platform, p.caption, p.hashtags || ''],
      );
    }

    insertedCount++;
    const dateStr = `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}`;
    console.log(`  ✓ 登録完了: scheduleId=${scheduleId}  ${dateStr}  ${template.name}`);
  }

  await conn.end();
  console.log(`\n合計 ${insertedCount} 件のスケジュールを登録しました。`);
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
