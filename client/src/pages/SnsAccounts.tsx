import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SnsAccounts() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SNSアカウント管理</h1>
          <p className="text-muted-foreground mt-2">Instagram、X、ThreadsのAPI連携を設定します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>連携アカウント</CardTitle>
            <CardDescription>現在連携されているSNSアカウントの一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>この機能は開発中です</p>
              <Button className="mt-4" onClick={() => toast.info("機能は近日公開予定です")}>
                アカウントを追加
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
