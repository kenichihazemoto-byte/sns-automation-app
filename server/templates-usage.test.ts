import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Templates Usage Feature", () => {
  it("should have created templates in database", async () => {
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { postTemplates } = await import("../drizzle/schema");
    
    const db = drizzle(process.env.DATABASE_URL!);
    const templates = await db.select().from(postTemplates);
    
    expect(templates.length).toBeGreaterThanOrEqual(4);
    
    const hazemoTemplates = templates.filter(t => t.companyName === "ハゼモト建設");
    const clinicTemplates = templates.filter(t => t.companyName === "クリニックアーキプロ");
    
    expect(hazemoTemplates.length).toBeGreaterThanOrEqual(2);
    expect(clinicTemplates.length).toBeGreaterThanOrEqual(2);
  });

  it("should have TemplateSelector component", () => {
    const templateSelectorPath = join(__dirname, "../client/src/components/TemplateSelector.tsx");
    expect(existsSync(templateSelectorPath)).toBe(true);

    const content = readFileSync(templateSelectorPath, "utf-8");
    expect(content).toContain("TemplateSelector");
    expect(content).toContain("trpc.postTemplates.list.useQuery");
  });

  it("should have template selection in Demo page", () => {
    const demoPath = join(__dirname, "../client/src/pages/Demo.tsx");
    const content = readFileSync(demoPath, "utf-8");
    expect(content).toContain("TemplateSelector");
    expect(content).toContain("handleApplyTemplate");
  });

  it("should have PostTemplates management page", () => {
    const postTemplatesPath = join(__dirname, "../client/src/pages/PostTemplates.tsx");
    expect(existsSync(postTemplatesPath)).toBe(true);

    const content = readFileSync(postTemplatesPath, "utf-8");
    expect(content).toContain("PostTemplates");
    expect(content).toContain("trpc.postTemplates");
  });

  it("should have postTemplates router in server", () => {
    const routersPath = join(__dirname, "./routers.ts");
    const content = readFileSync(routersPath, "utf-8");
    expect(content).toContain("postTemplates:");
    expect(content).toContain("list");
    expect(content).toContain("create");
    expect(content).toContain("update");
    expect(content).toContain("delete");
  });

  it("should have template database functions", () => {
    const dbPath = join(__dirname, "./db.ts");
    const content = readFileSync(dbPath, "utf-8");
    expect(content).toContain("getPostTemplatesByUserId");
    expect(content).toContain("createPostTemplate");
    expect(content).toContain("updatePostTemplate");
    expect(content).toContain("deletePostTemplate");
  });

  it("should have templates with correct structure", async () => {
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { postTemplates } = await import("../drizzle/schema");
    
    const db = drizzle(process.env.DATABASE_URL!);
    const templates = await db.select().from(postTemplates).limit(1);
    
    if (templates.length > 0) {
      const template = templates[0];
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("companyName");
      expect(template).toHaveProperty("isBeforeAfter");
      expect(template).toHaveProperty("instagramCaption");
      expect(template).toHaveProperty("xCaption");
      expect(template).toHaveProperty("threadsCaption");
      expect(template).toHaveProperty("instagramHashtags");
      expect(template).toHaveProperty("defaultPostTime");
    }
  });
});
