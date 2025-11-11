import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PostCalendar() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">投稿カレンダー</h1>
          <p className="text-muted-foreground mt-2">予約投稿のスケジュールを管理します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>カレンダービュー</CardTitle>
            <CardDescription>投稿スケジュールを視覚的に確認</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>この機能は開発中です</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
