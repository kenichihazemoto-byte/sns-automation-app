import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { postTemplates } from "../drizzle/schema";
import { like, or } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const rows = await db
  .select({ name: postTemplates.name })
  .from(postTemplates)
  .where(
    or(
      like(postTemplates.name, "%就労%"),
      like(postTemplates.name, "%季節%"),
      like(postTemplates.name, "%スタッフ%"),
      like(postTemplates.name, "%ラトリエ%"),
      like(postTemplates.name, "%子ども%")
    )
  );

console.log("既存テンプレート名:");
rows.forEach(r => console.log(" -", r.name));
await conn.end();
