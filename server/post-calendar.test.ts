import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Post Calendar Feature", () => {
  it("should have PostCalendar page component", () => {
    const postCalendarPath = join(__dirname, "../client/src/pages/PostCalendar.tsx");
    expect(existsSync(postCalendarPath)).toBe(true);

    const content = readFileSync(postCalendarPath, "utf-8");
    expect(content).toContain("PostCalendar");
    expect(content).toContain("react-big-calendar");
    expect(content).toContain("withDragAndDrop");
  });

  it("should have PostCalendar route in App.tsx", () => {
    const appPath = join(__dirname, "../client/src/App.tsx");
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain('import PostCalendar from "./pages/PostCalendar"');
    expect(content).toContain('path={"/calendar"}');
    expect(content).toContain("component={PostCalendar}");
  });

  it("should have calendar menu item in DashboardLayout", () => {
    const dashboardLayoutPath = join(__dirname, "../client/src/components/DashboardLayout.tsx");
    const content = readFileSync(dashboardLayoutPath, "utf-8");
    expect(content).toContain("投稿カレンダー");
    expect(content).toContain('path: "/calendar"');
  });

  it("should have drag and drop dependencies installed", () => {
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson.dependencies["react-big-calendar"]).toBeDefined();
    expect(packageJson.dependencies["date-fns"]).toBeDefined();
    expect(packageJson.dependencies["react-dnd"]).toBeDefined();
    expect(packageJson.dependencies["react-dnd-html5-backend"]).toBeDefined();
  });

  it("should use trpc.posts.schedules API", () => {
    const postCalendarPath = join(__dirname, "../client/src/pages/PostCalendar.tsx");
    const content = readFileSync(postCalendarPath, "utf-8");
    expect(content).toContain("trpc.posts.schedules.useQuery");
    expect(content).toContain("trpc.posts.updateSchedule.useMutation");
  });

  it("should have event styling by company name", () => {
    const postCalendarPath = join(__dirname, "../client/src/pages/PostCalendar.tsx");
    const content = readFileSync(postCalendarPath, "utf-8");
    expect(content).toContain("ハゼモト建設");
    expect(content).toContain("クリニックアーキプロ");
    expect(content).toContain("eventStyleGetter");
  });

  it("should have drag and drop handler", () => {
    const postCalendarPath = join(__dirname, "../client/src/pages/PostCalendar.tsx");
    const content = readFileSync(postCalendarPath, "utf-8");
    expect(content).toContain("handleEventDrop");
    expect(content).toContain("onEventDrop");
  });

  it("should have detail dialog", () => {
    const postCalendarPath = join(__dirname, "../client/src/pages/PostCalendar.tsx");
    const content = readFileSync(postCalendarPath, "utf-8");
    expect(content).toContain("Dialog");
    expect(content).toContain("handleSelectEvent");
    expect(content).toContain("onSelectEvent");
  });
});
