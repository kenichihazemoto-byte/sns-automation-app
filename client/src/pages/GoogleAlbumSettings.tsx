import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, ImageIcon, GripVertical, Pencil, Instagram, Twitter, Eye, Loader2 } from "lucide-react";

// 投稿タイプ選択肢
 const POST_CATEGORIES = [
  { value: null, label: "すべての投稿タイプで使用" },
  { value: "construction_case", label: "🏠 施工事例" },
  { value: "open_house", label: "📍 見学会・イベント" },
  { value: "blog_update", label: "📝 ブログ更新" },
  { value: "local_activity", label: "🌿 地域活動" },
  { value: "staff_intro", label: "👤 スタッフ紹介" },
  { value: "campaign", label: "🎉 キャンペーン" },
  { value: "general", label: "📸 その他一般" },
] as const;

type Album = {
  id: number;
  title: string;
  url: string;
  label: string | null;
  isActive: number;
  sortOrder: number;
  targetSnsAccountIds: string | null;
  postCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SnsAccount = {
  id: number;
  companyName: string;
  platform: string;
  accountName: string;
  isActive: boolean;
};

// プラットフォームアイコン
function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
  if (platform === "x") return <Twitter className="w-3.5 h-3.5 text-sky-500" />;
  return <span className="text-xs font-bold text-purple-500">T</span>;
}

// プラットフォーム表示名
function platformLabel(platform: string) {
  if (platform === "instagram") return "Instagram";
  if (platform === "x") return "X";
  return "Threads";
}

// アルバムのSNSアカウントIDを配列として取得
function parseTargetIds(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// アルバムプレビューダイアログ
function AlbumPreviewDialog({ album }: { album: Album }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = trpc.googlePhotoAlbums.preview.useQuery(
    { url: album.url },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-blue-600"
          title="プレビュー"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            {album.title} — プレビュー
          </DialogTitle>
          <DialogDescription>
            アルバムのサムネイル画像（最大6枚）を表示します。
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>読み込み中...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-red-500">
              プレビューの取得に失敗しました。
            </div>
          ) : data && data.thumbnails.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {data.thumbnails.map((src, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted border">
                  <img
                    src={src}
                    alt={`サムネイル ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">プレビュー画像が見つかりませんでした。</p>
              <p className="text-xs mt-1">アルバムが非公開または空の可能性があります。</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <a
            href={album.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline flex items-center gap-1 mr-auto"
          >
            Googleフォトで開く
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button variant="outline" onClick={() => setOpen(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GoogleAlbumSettings() {
  const utils = trpc.useUtils();
  const { data: albums = [], isLoading } = trpc.googlePhotoAlbums.list.useQuery();
  const { data: snsAccounts = [] } = trpc.snsAccounts.list.useQuery();

  const createMutation = trpc.googlePhotoAlbums.create.useMutation({
    onSuccess: () => {
      utils.googlePhotoAlbums.list.invalidate();
      toast.success("アルバムを追加しました");
      setAddOpen(false);
      setForm({ title: "", url: "", label: "", postCategory: null });
      setSelectedIds([]);
    },
    onError: (e) => toast.error(`追加失敗: ${e.message}`),
  });

  const updateMutation = trpc.googlePhotoAlbums.update.useMutation({
    onSuccess: () => {
      utils.googlePhotoAlbums.list.invalidate();
      toast.success("更新しました");
      setEditTarget(null);
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
  const [editTarget, setEditTarget] = useState<Album | null>(null);
  const [form, setForm] = useState({ title: "", url: "", label: "", postCategory: null as string | null });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editForm, setEditForm] = useState({ title: "", url: "", label: "", postCategory: null as string | null });
  const [editSelectedIds, setEditSelectedIds] = useState<number[]>([]);

  const activeSnsAccounts = (snsAccounts as SnsAccount[]).filter(a => a.isActive);

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error("タイトルを入力してください"); return; }
    if (!form.url.trim()) { toast.error("アルバムURLを入力してください"); return; }
    createMutation.mutate({
      title: form.title.trim(),
      url: form.url.trim(),
      label: form.label.trim() || undefined,
      isActive: 1,
      sortOrder: (albums as Album[]).length,
      targetSnsAccountIds: selectedIds.length > 0 ? selectedIds : undefined,
      postCategory: form.postCategory,
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

  const openEdit = (album: Album) => {
    setEditTarget(album);
    setEditForm({ title: album.title, url: album.url, label: album.label ?? "", postCategory: album.postCategory ?? null });
    setEditSelectedIds(parseTargetIds(album.targetSnsAccountIds));
  };

  const handleEdit = () => {
    if (!editTarget) return;
    if (!editForm.title.trim()) { toast.error("タイトルを入力してください"); return; }
    if (!editForm.url.trim()) { toast.error("アルバムURLを入力してください"); return; }
    updateMutation.mutate({
      id: editTarget.id,
      title: editForm.title.trim(),
      url: editForm.url.trim(),
      label: editForm.label.trim() || undefined,
      targetSnsAccountIds: editSelectedIds.length > 0 ? editSelectedIds : null,
      postCategory: editForm.postCategory,
    });
  };

  const toggleId = (id: number, ids: number[], setIds: (v: number[]) => void) => {
    setIds(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
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
              SNS投稿生成に使用するアルバムと、アルバムごとの投稿先SNSアカウントを管理します。
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                アルバムを追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>アルバムを追加</DialogTitle>
                <DialogDescription>
                  GoogleフォトアルバムのURLと投稿先SNSアカウントを設定してください。
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
                <div className="space-y-1">
                  <Label>投稿タイプ（任意）</Label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={form.postCategory ?? ""}
                    onChange={e => setForm(f => ({ ...f, postCategory: e.target.value || null }))}
                  >
                    {POST_CATEGORIES.map(c => (
                      <option key={String(c.value)} value={c.value ?? ""}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    設定すると、そのタイプの投稿生成時にこのアルバムが優先的に使われます
                  </p>
                </div>
                <SnsAccountSelector
                  accounts={activeSnsAccounts}
                  selectedIds={selectedIds}
                  onToggle={(id) => toggleId(id, selectedIds, setSelectedIds)}
                />
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
        ) : (albums as Album[]).length === 0 ? (
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
            {(albums as Album[]).map((album) => {
              const targetIds = parseTargetIds(album.targetSnsAccountIds);
              const targetAccounts = activeSnsAccounts.filter(a => targetIds.includes(a.id));
              return (
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
                          {album.postCategory && (
                            <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                              {POST_CATEGORIES.find(c => c.value === album.postCategory)?.label ?? album.postCategory}
                            </Badge>
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
                        {/* 投稿先SNSアカウント表示 */}
                        <div className="mt-2">
                          {targetAccounts.length === 0 ? (
                            <span className="text-xs text-muted-foreground">投稿先：全SNSアカウント（未指定）</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {targetAccounts.map(acc => (
                                <span key={acc.id} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                                  <PlatformIcon platform={acc.platform} />
                                  <span>{acc.accountName}</span>
                                  <span className="text-muted-foreground">({acc.companyName})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* プレビューボタン */}
                        <AlbumPreviewDialog album={album} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(album)}
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 ml-1">
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
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 使い方ガイド */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">使い方</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-1">
            <p>1. 「アルバムを追加」でGoogleフォトのアルバムURLを登録します</p>
            <p>2. 各アルバムに投稿先SNSアカウントを紐付けると、そのアルバムの写真は指定したアカウントにのみ投稿されます</p>
            <p>3. 投稿先を指定しない場合は全SNSアカウントが対象になります</p>
            <p>4. 目のアイコンでアルバムのサムネイルをプレビューできます</p>
            <p>5. 鉛筆アイコンから設定を後から変更できます</p>
          </CardContent>
        </Card>
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>アルバムを編集</DialogTitle>
            <DialogDescription>
              アルバムの設定と投稿先SNSアカウントを変更します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>タイトル <span className="text-red-500">*</span></Label>
              <Input
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>アルバムURL <span className="text-red-500">*</span></Label>
              <Input
                value={editForm.url}
                onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>ラベル（任意）</Label>
              <Input
                value={editForm.label}
                onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>投稿タイプ（任意）</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={editForm.postCategory ?? ""}
                onChange={e => setEditForm(f => ({ ...f, postCategory: e.target.value || null }))}
              >
                {POST_CATEGORIES.map(c => (
                  <option key={String(c.value)} value={c.value ?? ""}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                設定すると、そのタイプの投稿生成時にこのアルバムが優先的に使われます
              </p>
            </div>
            <SnsAccountSelector
              accounts={activeSnsAccounts}
              selectedIds={editSelectedIds}
              onToggle={(id) => toggleId(id, editSelectedIds, setEditSelectedIds)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>キャンセル</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "保存中..." : "保存する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// SNSアカウント選択コンポーネント
function SnsAccountSelector({
  accounts,
  selectedIds,
  onToggle,
}: {
  accounts: SnsAccount[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="space-y-1">
        <Label>投稿先SNSアカウント</Label>
        <p className="text-xs text-muted-foreground">
          SNSアカウントが登録されていません。先にSNSアカウントを登録してください。
        </p>
      </div>
    );
  }

  // 会社ごとにグループ化
  const grouped = accounts.reduce<Record<string, SnsAccount[]>>((acc, a) => {
    if (!acc[a.companyName]) acc[a.companyName] = [];
    acc[a.companyName].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      <div>
        <Label>投稿先SNSアカウント</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          指定しない場合は全アカウントが対象になります
        </p>
      </div>
      <div className="border rounded-md p-3 space-y-3 bg-muted/30">
        {Object.entries(grouped).map(([company, accs]) => (
          <div key={company}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{company}</p>
            <div className="space-y-1.5">
              {accs.map(acc => (
                <label
                  key={acc.id}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={selectedIds.includes(acc.id)}
                    onCheckedChange={() => onToggle(acc.id)}
                  />
                  <span className="flex items-center gap-1.5 text-sm">
                    <PlatformIcon platform={acc.platform} />
                    <span className="font-medium">{acc.accountName}</span>
                    <span className="text-muted-foreground text-xs">({platformLabel(acc.platform)})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-blue-600">
          {selectedIds.length}件のアカウントを選択中
        </p>
      )}
    </div>
  );
}
