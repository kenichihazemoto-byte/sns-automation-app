import { drizzle } from "drizzle-orm/mysql2";
import { post_templates } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const templates = [
  {
    name: "ハゼモト建設 - ビフォーアフター",
    description: "ハゼモト建設のビフォーアフター投稿用テンプレート",
    companyName: "ハゼモト建設",
    postType: "before_after",
    instagramTemplate: "🏗️ 施工事例をご紹介します\n\n{{description}}\n\n📍 施工場所: {{location}}\n⏱️ 工期: {{duration}}\n\n#ハゼモト建設 #リフォーム #リノベーション #施工事例 #ビフォーアフター #住宅リフォーム #内装工事 #外装工事 #建築 #工務店",
    xTemplate: "🏗️ 施工事例\n\n{{description}}\n\n📍 {{location}}\n⏱️ {{duration}}\n\n#ハゼモト建設 #リフォーム #施工事例",
    threadsTemplate: "🏗️ 施工事例をご紹介\n\n{{description}}\n\n施工場所: {{location}}\n工期: {{duration}}",
    defaultHashtags: "#ハゼモト建設 #リフォーム #リノベーション #施工事例 #ビフォーアフター",
    defaultPostTime: "14:00",
  },
  {
    name: "ハゼモト建設 - 通常投稿",
    description: "ハゼモト建設の通常投稿用テンプレート",
    companyName: "ハゼモト建設",
    postType: "normal",
    instagramTemplate: "🏗️ {{title}}\n\n{{description}}\n\n#ハゼモト建設 #リフォーム #リノベーション #住宅リフォーム #内装工事 #外装工事 #建築 #工務店 #施工事例",
    xTemplate: "🏗️ {{title}}\n\n{{description}}\n\n#ハゼモト建設 #リフォーム",
    threadsTemplate: "🏗️ {{title}}\n\n{{description}}",
    defaultHashtags: "#ハゼモト建設 #リフォーム #リノベーション #住宅リフォーム",
    defaultPostTime: "14:00",
  },
  {
    name: "クリニックアーキプロ - ビフォーアフター",
    description: "クリニックアーキプロのビフォーアフター投稿用テンプレート",
    companyName: "クリニックアーキプロ",
    postType: "before_after",
    instagramTemplate: "🏥 クリニック設計事例\n\n{{description}}\n\n📍 施工場所: {{location}}\n⏱️ 工期: {{duration}}\n\n#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所 #ビフォーアフター #クリニック開業 #医院設計 #内装デザイン #建築設計",
    xTemplate: "🏥 クリニック設計事例\n\n{{description}}\n\n📍 {{location}}\n⏱️ {{duration}}\n\n#クリニックアーキプロ #クリニック設計",
    threadsTemplate: "🏥 クリニック設計事例\n\n{{description}}\n\n施工場所: {{location}}\n工期: {{duration}}",
    defaultHashtags: "#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所 #ビフォーアフター",
    defaultPostTime: "10:00",
  },
  {
    name: "クリニックアーキプロ - 通常投稿",
    description: "クリニックアーキプロの通常投稿用テンプレート",
    companyName: "クリニックアーキプロ",
    postType: "normal",
    instagramTemplate: "🏥 {{title}}\n\n{{description}}\n\n#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所 #クリニック開業 #医院設計 #内装デザイン #建築設計",
    xTemplate: "🏥 {{title}}\n\n{{description}}\n\n#クリニックアーキプロ #クリニック設計",
    threadsTemplate: "🏥 {{title}}\n\n{{description}}",
    defaultHashtags: "#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所",
    defaultPostTime: "10:00",
  },
];

async function main() {
  console.log("Creating templates...");
  
  for (const template of templates) {
    await db.insert(post_templates).values({
      userId: 1, // Assuming user ID 1 is the owner
      ...template,
    });
    console.log(`✓ Created template: ${template.name}`);
  }
  
  console.log("\nAll templates created successfully!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error creating templates:", error);
  process.exit(1);
});
