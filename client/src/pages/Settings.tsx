import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [industry, setIndustry] = useState(user?.industry || "");
  const [albums, setAlbums] = useState<string[]>(() => {
    try {
      return user?.googlePhotoAlbums ? JSON.parse(user.googlePhotoAlbums) : [];
    } catch {
      return [];
    }
  });
  const [newAlbumUrl, setNewAlbumUrl] = useState("");

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("プロフィールを更新しました");
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      companyName,
      industry,
      googlePhotoAlbums: JSON.stringify(albums),
    });
  };

  const handleAddAlbum = () => {
    if (!newAlbumUrl.trim()) {
      toast.error("アルバムURLを入力してください");
      return;
    }

    if (!newAlbumUrl.includes("photos.app.goo.gl") && !newAlbumUrl.includes("photos.google.com")) {
      toast.error("有効なGoogle フォトのURLを入力してください");
      return;
    }

    setAlbums([...albums, newAlbumUrl]);
    setNewAlbumUrl("");
    toast.success("アルバムを追加しました");
  };

  const handleRemoveAlbum = (index: number) => {
    setAlbums(albums.filter((_, i) => i !== index));
    toast.success("アルバムを削除しました");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">ユーザー設定</h1>
          <p className="text-muted-foreground mt-2">
            プロフィール情報とGoogle フォトアルバムを管理します
          </p>
        </div>

        {/* プロフィール情報 */}
        <Card>
          <CardHeader>
            <CardTitle>プロフィール情報</CardTitle>
            <CardDescription>
              会社名と業種を設定してください。AI が投稿文を生成する際に使用されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">会社名 *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例: ハゼモト建設"
              />
            </div>

            <div>
              <Label htmlFor="industry">業種</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="例: 建設業、医療施設設計など"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || !companyName}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  プロフィールを保存
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Google フォトアルバム */}
        <Card>
          <CardHeader>
            <CardTitle>Google フォトアルバム</CardTitle>
            <CardDescription>
              SNS投稿に使用する写真が保存されているGoogle フォトの共有アルバムURLを追加してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 既存のアルバム一覧 */}
            {albums.length > 0 && (
              <div className="space-y-2">
                <Label>登録済みアルバム</Label>
                <div className="space-y-2">
                  {albums.map((album, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium">アルバム {index + 1}</p>
                        <p className="text-xs text-muted-foreground truncate">{album}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAlbum(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新しいアルバムを追加 */}
            <div className="space-y-2">
              <Label htmlFor="newAlbum">新しいアルバムを追加</Label>
              <div className="flex gap-2">
                <Input
                  id="newAlbum"
                  value={newAlbumUrl}
                  onChange={(e) => setNewAlbumUrl(e.target.value)}
                  placeholder="https://photos.app.goo.gl/..."
                  className="flex-1"
                />
                <Button onClick={handleAddAlbum} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  追加
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Google フォトで共有リンクを作成し、そのURLを貼り付けてください
              </p>
            </div>

            {albums.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>まだアルバムが登録されていません</p>
                <p className="text-sm mt-2">上のフォームからGoogle フォトアルバムのURLを追加してください</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* アカウント情報 */}
        <Card>
          <CardHeader>
            <CardTitle>アカウント情報</CardTitle>
            <CardDescription>
              ログイン中のアカウント情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">名前</Label>
                <p className="font-medium">{user?.name || "未設定"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">メールアドレス</Label>
                <p className="font-medium">{user?.email || "未設定"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ログイン方法</Label>
                <p className="font-medium">{user?.loginMethod || "未設定"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">権限</Label>
                <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                  {user?.role === "admin" ? "管理者" : "ユーザー"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使い方ガイド */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">設定のヒント</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>会社名</strong>は、AI が投稿文を生成する際に使用されます。
              正確な会社名を入力することで、より適切な投稿文が生成されます。
            </p>
            <p>
              <strong>Google フォトアルバム</strong>は、複数登録することができます。
              デモページで写真を取得する際に、登録されたすべてのアルバムからランダムに選択されます。
            </p>
            <p className="font-medium text-primary">
              設定を変更した後は、必ず「プロフィールを保存」ボタンをクリックしてください。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
