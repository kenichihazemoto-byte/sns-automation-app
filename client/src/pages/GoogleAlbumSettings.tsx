import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, ImageIcon, GripVertical } from "lucide-react";

type Album = {
  id: number;
  title: string;
  url: string;
  label: string | null;
  isActive: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function GoogleAlbumSettings() {
  const utils = trpc.useUtils();
  const { data: albums = [], isLoading } = trpc.googlePhotoAlbums.list.useQuery();

  const createMutation = trpc.googlePhotoAlbums.create.useMutation({
    onSuccess: () => {
      utils.googlePhotoAlbums.list.invalidate();
      toast.success("アルバムを追加しました");
      setAddOpen(false);
      setForm({ title: "", url: "", label: "" });
    },
    onError: (e) => toast.error(`追加失敗: ${e.message}`),
  });

  const updateMutation = trpc.googlePhotoAlbums.update.useMutation({
    onSuccess: () => {
      utils.googlePhotoAlbums.list.invalidate();
      toast.success("更新しました");
    },
    onError: (e) => toast.error(`更新失敗: ${e.message}`),
  });

  const deleteMutation = trpc.googlePhotoAlbums.delete.useMutation({
    onSuccess: () => {
      utils.googlePhotoAlbums.list.invalidate();
      toast.success("アルバムを削除しました");
    },
    onError: (e) => toast.error(`削除失敗: ${e.message}`),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [form, setForm] = useState({ title: "", url: "", label: "" });

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error("タイトルを入力してください"); return; }
    if (!form.url.trim()) { toast.error("アルバムURLを入力してください"); return; }
    createMutation.mutate({
      title: form.title.trim(),
      url: form.url.trim(),
      label: form.label.trim() || undefined,
      isActive: 1,
      sortOrder: albums.length,
    });
  };

  const handleToggleActive = (album: Album) => {
    updateMutation.mutate({ id: album.id, isActive: album.isActive === 1 ? 0 : 1 });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-blue-500" />
              Googleフォトアルバム管理
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              SNS投稿生成に使用するGoogleフォトアルバムを管理します。有効なアルバムからランダムに写真が選ばれます。
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                アルバムを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>アルバムを追加</DialogTitle>
                <DialogDescription>
                  GoogleフォトアルバムのURLを入力してください。共有アルバムのURLが必要です。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>タイトル <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="例：2026年竣工写真"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>アルバムURL <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="https://photos.app.goo.gl/..."
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Googleフォトで「共有」→「リンクをコピー」で取得できます
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>ラベル（任意）</Label>
                  <Input
                    placeholder="例：竣工写真、現場写真"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
                <Button onClick={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "追加中..." : "追加する"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* アルバム一覧 */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
        ) : albums.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">アルバムが登録されていません</p>
              <p className="text-sm text-muted-foreground mt-1">
                「アルバムを追加」ボタンからGoogleフォトのアルバムURLを登録してください
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(albums as Album[]).map((album) => (
              <Card key={album.id} className={album.isActive === 0 ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{album.title}</span>
                        {album.label && (
                          <Badge variant="secondary" className="text-xs">{album.label}</Badge>
                        )}
                        <Badge variant={album.isActive === 1 ? "default" : "outline"} className="text-xs">
                          {album.isActive === 1 ? "有効" : "無効"}
                        </Badge>
                      </div>
                      <a
                        href={album.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        {album.url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">有効</Label>
                        <Switch
                          checked={album.isActive === 1}
                          onCheckedChange={() => handleToggleActive(album)}
                          disabled={updateMutation.isPending}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(album)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 使い方ガイド */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">使い方</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-1">
            <p>1. Googleフォトでアルバムを開き、「共有」→「リンクをコピー」でURLを取得</p>
            <p>2. 「アルバムを追加」ボタンからURLとタイトルを入力して登録</p>
            <p>3. 有効なアルバムからランダムに写真が選ばれてSNS投稿に使用されます</p>
            <p>4. 一時的に使いたくないアルバムはスイッチで無効化できます</p>
          </CardContent>
        </Card>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アルバムを削除しますか？</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.title}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
