import { drizzle } from "drizzle-orm/mysql2";
import { postTemplates } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const templates = [
  {
    name: "ハゼモト建設 - ビフォーアフター",
    description: "ハゼモト建設のビフォーアフター投稿用テンプレート",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: true,
    instagramCaption: "🏗️ 施工事例をご紹介します\n\n{{description}}\n\n📍 施工場所: {{location}}\n⏱️ 工期: {{duration}}",
    instagramHashtags: "#ハゼモト建設 #リフォーム #リノベーション #施工事例 #ビフォーアフター #住宅リフォーム #内装工事 #外装工事 #建築 #工務店",
    xCaption: "🏗️ 施工事例\n\n{{description}}\n\n📍 {{location}}\n⏱️ {{duration}}",
    xHashtags: "#ハゼモト建設 #リフォーム #施工事例",
    threadsCaption: "🏗️ 施工事例をご紹介\n\n{{description}}\n\n施工場所: {{location}}\n工期: {{duration}}",
    threadsHashtags: "#ハゼモト建設 #リフォーム",
    defaultPostTime: "14:00",
  },
  {
    name: "ハゼモト建設 - 通常投稿",
    description: "ハゼモト建設の通常投稿用テンプレート",
    companyName: "ハゼモト建設" as const,
    isBeforeAfter: false,
    instagramCaption: "🏗️ {{title}}\n\n{{description}}",
    instagramHashtags: "#ハゼモト建設 #リフォーム #リノベーション #住宅リフォーム #内装工事 #外装工事 #建築 #工務店 #施工事例",
    xCaption: "🏗️ {{title}}\n\n{{description}}",
    xHashtags: "#ハゼモト建設 #リフォーム",
    threadsCaption: "🏗️ {{title}}\n\n{{description}}",
    threadsHashtags: "#ハゼモト建設",
    defaultPostTime: "14:00",
  },
  {
    name: "クリニックアーキプロ - ビフォーアフター",
    description: "クリニックアーキプロのビフォーアフター投稿用テンプレート",
    companyName: "クリニックアーキプロ" as const,
    isBeforeAfter: true,
    instagramCaption: "🏥 クリニック設計事例\n\n{{description}}\n\n📍 施工場所: {{location}}\n⏱️ 工期: {{duration}}",
    instagramHashtags: "#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所 #ビフォーアフター #クリニック開業 #医院設計 #内装デザイン #建築設計",
    xCaption: "🏥 クリニック設計事例\n\n{{description}}\n\n📍 {{location}}\n⏱️ {{duration}}",
    xHashtags: "#クリニックアーキプロ #クリニック設計",
    threadsCaption: "🏥 クリニック設計事例\n\n{{description}}\n\n施工場所: {{location}}\n工期: {{duration}}",
    threadsHashtags: "#クリニックアーキプロ #クリニック設計",
    defaultPostTime: "10:00",
  },
  {
    name: "クリニックアーキプロ - 通常投稿",
    description: "クリニックアーキプロの通常投稿用テンプレート",
    companyName: "クリニックアーキプロ" as const,
    isBeforeAfter: false,
    instagramCaption: "🏥 {{title}}\n\n{{description}}",
    instagramHashtags: "#クリニックアーキプロ #クリニック設計 #医療施設 #設計事務所 #クリニック開業 #医院設計 #内装デザイン #建築設計",
    xCaption: "🏥 {{title}}\n\n{{description}}",
    xHashtags: "#クリニックアーキプロ #クリニック設計",
    threadsCaption: "🏥 {{title}}\n\n{{description}}",
    threadsHashtags: "#クリニックアーキプロ",
    defaultPostTime: "10:00",
  },
];

async function main() {
  console.log("Deleting existing templates...");
  // Delete all existing templates first
  await db.delete(postTemplates);
  
  console.log("Creating templates...");
  
  for (const template of templates) {
    await db.insert(postTemplates).values({
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
