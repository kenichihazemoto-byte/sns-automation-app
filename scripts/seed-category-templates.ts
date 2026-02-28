/**
 * カテゴリ別テンプレートのシードスクリプト
 * ラトリエルアッシュ（パン屋）、子ども食堂、就労支援B型の活動紹介、
 * スタッフ紹介、季節の話題などのテンプレートを追加
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and } from "drizzle-orm";
import { users, postTemplates } from "../drizzle/schema";

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection);

const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID!;

// 新しいカテゴリ別テンプレート
const categoryTemplates = [
  // ===== ラトリエルアッシュ（パン屋）=====
  {
    name: "ラトリエルアッシュ：本日のパン紹介",
    description: "今日焼き上がったパンを紹介する投稿。写真映えするビジュアルと、素材へのこだわりを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `今日も朝から焼き上がりました🍞

{パン名}、本日のおすすめです。

{パンの特徴や素材のこだわり}

北九州の地元の方に愛されるパン屋でありたい、そんな想いで毎日丁寧に焼いています。

ぜひお近くにお越しの際はお立ち寄りください🌿`,
    instagramHashtags: "#ラトリエルアッシュ #北九州パン屋 #北九州グルメ #手作りパン #焼きたてパン #地元パン屋 #ハゼモト建設 #北九州 #パン好き #朝ごはん",
    xCaption: "今日の焼き上がり🍞 {パン名}が出来上がりました！{パンの特徴} ぜひお立ち寄りください。 #ラトリエルアッシュ #北九州パン屋",
    xHashtags: "#ラトリエルアッシュ #北九州パン屋 #焼きたてパン",
    threadsCaption: "今日のおすすめパンは「{パン名}」です🍞 {パンの特徴や素材のこだわり} 北九州の地元の方に愛されるパン屋でありたいと思っています。お近くにお越しの際はぜひ！",
    threadsHashtags: "#ラトリエルアッシュ #北九州パン屋 #手作りパン",
  },
  {
    name: "ラトリエルアッシュ：季節限定パン",
    description: "季節ごとの限定パンを紹介する投稿。旬の食材や季節感を前面に出す。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `季節限定🌸 {季節}の特別なパンが登場しました！

{パン名}
{季節の食材や特徴について}

この時期だけの味わいを、ぜひ楽しんでいただければ嬉しいです。

数量限定ですので、お早めにどうぞ🙏`,
    instagramHashtags: "#ラトリエルアッシュ #季節限定 #北九州パン屋 #手作りパン #旬の食材 #限定パン #北九州グルメ #ハゼモト建設",
    xCaption: "🌸季節限定！{パン名}が登場しました。{季節の食材や特徴} 数量限定ですのでお早めに。 #ラトリエルアッシュ #北九州パン屋",
    xHashtags: "#ラトリエルアッシュ #季節限定パン #北九州",
    threadsCaption: "季節限定の{パン名}が登場しました🌸 {季節の食材や特徴について} 数量限定ですので、気になる方はお早めに！ #ラトリエルアッシュ",
    threadsHashtags: "#ラトリエルアッシュ #季節限定 #北九州パン屋",
  },

  // ===== 子ども食堂 =====
  {
    name: "子ども食堂：開催告知",
    description: "子ども食堂の開催を告知する投稿。温かみのある雰囲気と、地域への想いを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `子ども食堂のお知らせ🍚

{開催日時}
{開催場所}

どなたでも無料でご参加いただけます。
お子さんはもちろん、一人で食事をされているご高齢の方もぜひ。

「地域みんなで食卓を囲む」
そんな温かい時間を一緒に作りたいと思っています。

{問い合わせ先や申込方法}`,
    instagramHashtags: "#子ども食堂 #北九州子ども食堂 #地域貢献 #ハゼモト建設 #北九州 #地域のつながり #無料 #みんなの食堂 #こども食堂",
    xCaption: "子ども食堂開催のお知らせ🍚 {開催日時}、{開催場所}にて。どなたでも無料でご参加いただけます。{問い合わせ先} #子ども食堂 #北九州",
    xHashtags: "#子ども食堂 #北九州 #地域貢献",
    threadsCaption: "子ども食堂を開催します🍚 {開催日時}、{開催場所}にて。お子さんもご高齢の方も、どなたでも無料でご参加いただけます。地域みんなで食卓を囲みましょう！ {問い合わせ先や申込方法}",
    threadsHashtags: "#子ども食堂 #北九州 #地域貢献",
  },
  {
    name: "子ども食堂：開催報告",
    description: "子ども食堂の開催後の報告投稿。参加者の様子や感謝の気持ちを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `子ども食堂、無事に開催できました🍚✨

今日は{参加人数}名の方にお越しいただきました。
{印象的なエピソードや感想}

子どもたちの笑顔を見ていると、こういう場所が地域に必要だと改めて感じます。

次回の開催もお楽しみに。
ご参加いただいた皆さん、ありがとうございました！`,
    instagramHashtags: "#子ども食堂 #北九州子ども食堂 #地域貢献 #ハゼモト建設 #北九州 #ありがとう #地域のつながり #こども食堂",
    xCaption: "子ども食堂、無事終了しました🍚 今日は{参加人数}名の方にお越しいただきました。{印象的なエピソード} 次回もお楽しみに！ #子ども食堂 #北九州",
    xHashtags: "#子ども食堂 #北九州 #地域貢献",
    threadsCaption: "子ども食堂が無事に終わりました🍚 今日は{参加人数}名の方にお越しいただき、{印象的なエピソードや感想} 子どもたちの笑顔が何よりの励みです。ご参加いただいた皆さん、ありがとうございました！",
    threadsHashtags: "#子ども食堂 #北九州 #ありがとう",
  },

  // ===== 就労支援B型の活動紹介 =====
  {
    name: "就労支援B型：活動紹介",
    description: "就労支援B型の日常的な活動を紹介する投稿。利用者の成長や達成感を伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `就労支援の現場から📸

今日は{活動内容}に取り組みました。

{活動の様子や利用者の頑張り}

一人ひとりのペースを大切に、できることを少しずつ増やしていく。
そんな毎日の積み重ねが、大きな自信につながっていきます。`,
    instagramHashtags: "#就労支援B型 #北九州就労支援 #ハゼモト建設 #地域貢献 #就労支援 #北九州 #働くこと #社会参加",
    xCaption: "就労支援の現場から📸 今日は{活動内容}に取り組みました。{活動の様子} 一人ひとりのペースを大切にしています。 #就労支援B型 #北九州",
    xHashtags: "#就労支援B型 #北九州 #社会参加",
    threadsCaption: "今日の就労支援の様子です📸 {活動内容}に取り組みました。{活動の様子や利用者の頑張り} 一人ひとりのペースを大切に、できることを少しずつ増やしていく毎日です。",
    threadsHashtags: "#就労支援B型 #北九州 #地域貢献",
  },
  {
    name: "就労支援B型：成果・達成報告",
    description: "利用者の成果や達成を報告する投稿。具体的な成長を伝え、応援してもらう。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `嬉しいご報告です🎉

{利用者の成果や達成したこと（個人情報に配慮した表現で）}

最初は難しそうと感じていたことも、コツコツ続けることで
できるようになっていく。

その瞬間に立ち会えることが、私たちの喜びです。

これからも一緒に頑張っていきましょう！`,
    instagramHashtags: "#就労支援B型 #北九州就労支援 #ハゼモト建設 #成長 #達成 #北九州 #就労支援 #一緒に頑張ろう",
    xCaption: "嬉しいご報告🎉 {利用者の成果や達成したこと} コツコツ続けることで、できることが増えていきます。これからも一緒に頑張ります！ #就労支援B型 #北九州",
    xHashtags: "#就労支援B型 #成長 #北九州",
    threadsCaption: "嬉しいご報告です🎉 {利用者の成果や達成したこと（個人情報に配慮した表現で）} 最初は難しそうと感じていたことも、コツコツ続けることでできるようになっていく。その瞬間に立ち会えることが私たちの喜びです！",
    threadsHashtags: "#就労支援B型 #成長 #北九州",
  },

  // ===== スタッフ紹介 =====
  {
    name: "スタッフ紹介：ハゼモト建設",
    description: "ハゼモト建設のスタッフを紹介する投稿。人柄や仕事への想いを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `スタッフ紹介👷

{スタッフ名}（{役職・担当}）

{スタッフの仕事への想いや得意なこと}

「地元で生まれ地元で育った北九州の工務店」ハゼモト建設。
こんなスタッフたちが、お客様の家づくりをサポートしています。

お気軽にご相談ください😊`,
    instagramHashtags: "#ハゼモト建設 #スタッフ紹介 #北九州工務店 #北九州 #家づくり #工務店スタッフ #地元工務店 #北九州注文住宅",
    xCaption: "スタッフ紹介👷 {スタッフ名}（{役職・担当}）{スタッフの仕事への想いや得意なこと} 「地元で生まれ地元で育った北九州の工務店」ハゼモト建設のスタッフです。 #ハゼモト建設 #北九州",
    xHashtags: "#ハゼモト建設 #スタッフ紹介 #北九州工務店",
    threadsCaption: "スタッフ紹介です👷 {スタッフ名}（{役職・担当}）{スタッフの仕事への想いや得意なこと} 「地元で生まれ地元で育った北九州の工務店」ハゼモト建設のスタッフたちが、お客様の家づくりをサポートしています。",
    threadsHashtags: "#ハゼモト建設 #スタッフ紹介 #北九州",
  },

  // ===== 季節の話題 =====
  {
    name: "季節の話題：住まいのアドバイス",
    description: "季節に合わせた住まいのアドバイスや豆知識を投稿する。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `{季節}の住まいのポイント💡

{季節に合わせた住まいのアドバイスや豆知識}

「地元で生まれ地元で育った北九州の工務店」ハゼモト建設では、
北九州の気候に合わせた家づくりをご提案しています。

住まいのことでお悩みの方は、お気軽にご相談ください🏠`,
    instagramHashtags: "#ハゼモト建設 #住まいのアドバイス #北九州工務店 #北九州 #家づくり #住宅 #暮らし #高性能住宅",
    xCaption: "{季節}の住まいのポイント💡 {季節に合わせた住まいのアドバイスや豆知識} 北九州の気候に合わせた家づくりをご提案しています。 #ハゼモト建設 #北九州工務店",
    xHashtags: "#ハゼモト建設 #住まいのアドバイス #北九州",
    threadsCaption: "{季節}の住まいのポイントをご紹介します💡 {季節に合わせた住まいのアドバイスや豆知識} 「地元で生まれ地元で育った北九州の工務店」ハゼモト建設では、北九州の気候に合わせた家づくりをご提案しています。",
    threadsHashtags: "#ハゼモト建設 #住まいのアドバイス #北九州",
  },
  {
    name: "季節の話題：地域イベント参加報告",
    description: "地域のイベントに参加した様子を報告する投稿。地域との繋がりを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `{イベント名}に参加しました🎉

{イベントの様子や感想}

地域の皆さんと一緒に盛り上がれる場所があることが、
北九州に根ざして60年以上続けてきた私たちの誇りです。

これからも地域と一緒に歩んでいきたいと思います🌿`,
    instagramHashtags: "#ハゼモト建設 #北九州 #地域イベント #地域貢献 #北九州工務店 #地元 #創業60年 #地域密着",
    xCaption: "{イベント名}に参加しました🎉 {イベントの様子や感想} 地域の皆さんと一緒に盛り上がれることが私たちの誇りです。 #ハゼモト建設 #北九州",
    xHashtags: "#ハゼモト建設 #北九州 #地域イベント",
    threadsCaption: "{イベント名}に参加しました🎉 {イベントの様子や感想} 地域の皆さんと一緒に盛り上がれる場所があることが、北九州に根ざして60年以上続けてきた私たちの誇りです。これからも地域と一緒に歩んでいきます！",
    threadsHashtags: "#ハゼモト建設 #北九州 #地域貢献",
  },
  {
    name: "季節の話題：年始のご挨拶",
    description: "年始のご挨拶投稿。新年の抱負や感謝の気持ちを伝える。",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: `明けましておめでとうございます🎍

{新年の抱負や昨年の感謝の言葉}

「地元で生まれ地元で育った北九州の工務店」ハゼモト建設は、
今年も北九州の皆さんの暮らしに寄り添い続けます。

本年もどうぞよろしくお願いいたします🙏`,
    instagramHashtags: "#ハゼモト建設 #明けましておめでとう #北九州 #新年 #北九州工務店 #本年もよろしくお願いします #地元工務店",
    xCaption: "明けましておめでとうございます🎍 {新年の抱負や昨年の感謝の言葉} 今年も北九州の皆さんの暮らしに寄り添い続けます。本年もよろしくお願いいたします。 #ハゼモト建設",
    xHashtags: "#ハゼモト建設 #新年 #北九州",
    threadsCaption: "明けましておめでとうございます🎍 {新年の抱負や昨年の感謝の言葉} 「地元で生まれ地元で育った北九州の工務店」ハゼモト建設は、今年も北九州の皆さんの暮らしに寄り添い続けます。本年もよろしくお願いいたします🙏",
    threadsHashtags: "#ハゼモト建設 #新年 #北九州",
  },
];

async function seedCategoryTemplates() {
  try {
    // オーナーのユーザーIDを取得
    const userResult = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.openId, OWNER_OPEN_ID))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      console.error("Owner user not found. Please login first.");
      await connection.end();
      process.exit(1);
    }
    const userId = userResult[0].id;
    console.log(`Owner user ID: ${userId}`);

    // 各テンプレートを挿入（重複チェック付き）
    let insertedCount = 0;
    let skippedCount = 0;

    for (const template of categoryTemplates) {
      // 同名テンプレートが既存かチェック
      const existing = await db.select({ id: postTemplates.id })
        .from(postTemplates)
        .where(
          and(
            eq(postTemplates.name, template.name),
            eq(postTemplates.userId, userId)
          )
        )
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭ Skipped (already exists): ${template.name}`);
        skippedCount++;
        continue;
      }

      await db.insert(postTemplates).values({
        userId: userId,
        name: template.name,
        description: template.description,
        companyName: template.companyName,
        isBeforeAfter: template.isBeforeAfter,
        instagramCaption: template.instagramCaption,
        instagramHashtags: template.instagramHashtags,
        xCaption: template.xCaption,
        xHashtags: template.xHashtags,
        threadsCaption: template.threadsCaption,
        threadsHashtags: template.threadsHashtags,
      });
      console.log(`✓ Inserted: ${template.name}`);
      insertedCount++;
    }

    console.log(`\n✅ Done! Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding templates:", error);
    await connection.end();
    process.exit(1);
  }
}

seedCategoryTemplates();
