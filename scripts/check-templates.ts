import { drizzle } from "drizzle-orm/mysql2";
import { postTemplates } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  const templates = await db.select().from(postTemplates);
  console.log("Total templates:", templates.length);
  console.log("\nTemplates:");
  templates.forEach(t => {
    console.log(`- ID: ${t.id}, Name: ${t.name}, Company: ${t.companyName}, IsBeforeAfter: ${t.isBeforeAfter}`);
  });
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
