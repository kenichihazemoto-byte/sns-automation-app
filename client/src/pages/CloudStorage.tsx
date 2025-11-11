import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function CloudStorage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">クラウドストレージ設定</h1>
          <p className="text-muted-foreground mt-2">Google DriveまたはDropboxを連携します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ストレージ連携</CardTitle>
            <CardDescription>写真を自動取得するクラウドストレージを設定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>この機能は開発中です</p>
              <Button className="mt-4" onClick={() => toast.info("機能は近日公開予定です")}>
                ストレージを連携
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
