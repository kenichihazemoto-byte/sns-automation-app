import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { eq } from "drizzle-orm";
import { users, postTemplates } from "../drizzle/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データベース接続
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// テンプレートJSONを読み込み
const templatesPath = join(__dirname, "..", "hazemoto-templates.json");
const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));

console.log(`Loading ${templates.length} templates...`);

// ユーザーIDを取得（オーナー）
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;

async function seedTemplates() {
  try {
    // オーナーのユーザーIDを取得
    const userResult = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.openId, OWNER_OPEN_ID))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      console.error("Owner user not found");
      await connection.end();
      process.exit(1);
    }

    const userId = userResult[0].id;
    console.log(`Owner user ID: ${userId}`);

    // 既存のハゼモト建設テンプレートを削除
    await db.delete(postTemplates)
      .where(eq(postTemplates.companyName, "ハゼモト建設"));
    console.log("Deleted existing Hazemoto templates");

    // 新しいテンプレートを挿入
    for (const template of templates) {
      await db.insert(postTemplates).values({
        userId: userId,
        name: template.name,
        description: template.description,
        companyName: template.companyName,
        isBeforeAfter: template.isBeforeAfter || false,
        instagramCaption: template.instagramCaption,
        instagramHashtags: template.instagramHashtags,
        xCaption: template.xCaption,
        xHashtags: template.xHashtags,
        threadsCaption: template.threadsCaption,
        threadsHashtags: template.threadsHashtags,
      });
      console.log(`✓ Inserted template: ${template.name}`);
    }

    console.log("\nAll templates inserted successfully!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding templates:", error);
    await connection.end();
    process.exit(1);
  }
}

seedTemplates();
