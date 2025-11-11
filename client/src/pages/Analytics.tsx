import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">分析ダッシュボード</h1>
          <p className="text-muted-foreground mt-2">投稿のエンゲージメントを分析します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>エンゲージメント分析</CardTitle>
            <CardDescription>いいね数、コメント数などの推移</CardDescription>
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
