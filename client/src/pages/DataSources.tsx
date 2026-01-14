import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Database } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function DataSources() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    provider: "google_photos" as "google_photos" | "dropbox" | "onedrive" | "local",
    albumId: "",
    folderId: "",
    folderPath: "",
  });

  const { data: dataSources, refetch } = trpc.dataSources.list.useQuery();
  const createMutation = trpc.dataSources.create.useMutation({
    onSuccess: () => {
      toast.success("データ接続先を作成しました");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const updateMutation = trpc.dataSources.update.useMutation({
    onSuccess: () => {
      toast.success("データ接続先を更新しました");
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const deleteMutation = trpc.dataSources.delete.useMutation({
    onSuccess: () => {
      toast.success("データ接続先を削除しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "google_photos",
      albumId: "",
      folderId: "",
      folderPath: "",
    });
    setSelectedSource(null);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedSource) return;
    updateMutation.mutate({
      id: selectedSource.id,
      ...formData,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("本当にこのデータ接続先を削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (source: any) => {
    setSelectedSource(source);
    setFormData({
      name: source.name || "",
      provider: source.provider || "google_photos",
      albumId: source.albumId || "",
      folderId: source.folderId || "",
      folderPath: source.folderPath || "",
    });
    setIsEditDialogOpen(true);
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "google_photos":
        return "Google フォト";
      case "dropbox":
        return "Dropbox";
      case "onedrive":
        return "OneDrive";
      case "local":
        return "ローカル";
      default:
        return provider;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">データ接続先管理</h1>
            <p className="text-muted-foreground mt-2">
              写真データの接続先を管理します。テンプレートごとに異なる接続先を設定できます。
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataSources?.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>{source.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(source)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(source.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{getProviderLabel(source.provider)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {source.albumId && (
                    <div>
                      <span className="font-medium">アルバムID:</span> {source.albumId}
                    </div>
                  )}
                  {source.folderId && (
                    <div>
                      <span className="font-medium">フォルダID:</span> {source.folderId}
                    </div>
                  )}
                  {source.folderPath && (
                    <div>
                      <span className="font-medium">パス:</span> {source.folderPath}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">ステータス:</span>{" "}
                    <span className={source.isActive ? "text-green-600" : "text-gray-400"}>
                      {source.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいデータ接続先を作成</DialogTitle>
              <DialogDescription>
                写真データの接続先情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">接続先名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 施工事例アルバム"
                />
              </div>
              <div>
                <Label htmlFor="provider">プロバイダー</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: any) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_photos">Google フォト</SelectItem>
                    <SelectItem value="dropbox">Dropbox</SelectItem>
                    <SelectItem value="onedrive">OneDrive</SelectItem>
                    <SelectItem value="local">ローカル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.provider === "google_photos" && (
                <div>
                  <Label htmlFor="albumId">アルバムID</Label>
                  <Input
                    id="albumId"
                    value={formData.albumId}
                    onChange={(e) => setFormData({ ...formData, albumId: e.target.value })}
                    placeholder="Google フォトのアルバムID"
                  />
                </div>
              )}
              {(formData.provider === "dropbox" || formData.provider === "onedrive") && (
                <div>
                  <Label htmlFor="folderId">フォルダID</Label>
                  <Input
                    id="folderId"
                    value={formData.folderId}
                    onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                    placeholder="フォルダID"
                  />
                </div>
              )}
              {formData.provider === "local" && (
                <div>
                  <Label htmlFor="folderPath">フォルダパス</Label>
                  <Input
                    id="folderPath"
                    value={formData.folderPath}
                    onChange={(e) => setFormData({ ...formData, folderPath: e.target.value })}
                    placeholder="/path/to/folder"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>データ接続先を編集</DialogTitle>
              <DialogDescription>
                接続先情報を更新してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">接続先名</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-provider">プロバイダー</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: any) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_photos">Google フォト</SelectItem>
                    <SelectItem value="dropbox">Dropbox</SelectItem>
                    <SelectItem value="onedrive">OneDrive</SelectItem>
                    <SelectItem value="local">ローカル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.provider === "google_photos" && (
                <div>
                  <Label htmlFor="edit-albumId">アルバムID</Label>
                  <Input
                    id="edit-albumId"
                    value={formData.albumId}
                    onChange={(e) => setFormData({ ...formData, albumId: e.target.value })}
                  />
                </div>
              )}
              {(formData.provider === "dropbox" || formData.provider === "onedrive") && (
                <div>
                  <Label htmlFor="edit-folderId">フォルダID</Label>
                  <Input
                    id="edit-folderId"
                    value={formData.folderId}
                    onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
                  />
                </div>
              )}
              {formData.provider === "local" && (
                <div>
                  <Label htmlFor="edit-folderPath">フォルダパス</Label>
                  <Input
                    id="edit-folderPath"
                    value={formData.folderPath}
                    onChange={(e) => setFormData({ ...formData, folderPath: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
