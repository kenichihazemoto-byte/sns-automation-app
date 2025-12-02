import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PostTemplates() {
  const { user, loading: authLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // テンプレート一覧を取得
  const { data: templates, isLoading, refetch } = trpc.postTemplates.list.useQuery(undefined, {
    enabled: !!user,
  });

  // テンプレート作成
  const createTemplateMutation = trpc.postTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを作成しました");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // テンプレート更新
  const updateTemplateMutation = trpc.postTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを更新しました");
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // テンプレート削除
  const deleteTemplateMutation = trpc.postTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを削除しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 新規テンプレートフォームの状態
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    companyName: "ハゼモト建設" as "ハゼモト建設" | "クリニックアーキプロ",
    isBeforeAfter: false,
    instagramCaption: "",
    instagramHashtags: "",
    xCaption: "",
    xHashtags: "",
    threadsCaption: "",
    threadsHashtags: "",
    defaultPostTime: "14:00",
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name) {
      toast.error("テンプレート名を入力してください");
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      ...newTemplate,
    });
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("このテンプレートを削除してもよろしいですか？")) {
      deleteTemplateMutation.mutate({ id });
    }
  };

  const openEditDialog = (template: any) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || "",
      companyName: template.companyName,
      isBeforeAfter: template.isBeforeAfter,
      instagramCaption: template.instagramCaption || "",
      instagramHashtags: template.instagramHashtags || "",
      xCaption: template.xCaption || "",
      xHashtags: template.xHashtags || "",
      threadsCaption: template.threadsCaption || "",
      threadsHashtags: template.threadsHashtags || "",
      defaultPostTime: template.defaultPostTime || "14:00",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      companyName: "ハゼモト建設",
      isBeforeAfter: false,
      instagramCaption: "",
      instagramHashtags: "",
      xCaption: "",
      xHashtags: "",
      threadsCaption: "",
      threadsHashtags: "",
      defaultPostTime: "14:00",
    });
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">予約投稿テンプレート</h1>
            <p className="text-muted-foreground mt-2">
              よく使う投稿文や設定をテンプレートとして保存できます
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新規テンプレート
          </Button>
        </div>

        {templates && templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                テンプレートがまだありません
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                最初のテンプレートを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates?.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{template.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">会社名:</span>{" "}
                      {template.companyName}
                    </div>
                    <div>
                      <span className="font-semibold">投稿タイプ:</span>{" "}
                      {template.isBeforeAfter ? "ビフォーアフター" : "通常投稿"}
                    </div>
                    {template.defaultPostTime && (
                      <div>
                        <span className="font-semibold">デフォルト投稿時刻:</span>{" "}
                        {template.defaultPostTime}
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="font-semibold mb-1">設定済みプラットフォーム:</div>
                      <div className="flex gap-2 flex-wrap">
                        {template.instagramCaption && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                            Instagram
                          </span>
                        )}
                        {template.xCaption && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            X
                          </span>
                        )}
                        {template.threadsCaption && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            Threads
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 新規作成ダイアログ */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規テンプレート作成</DialogTitle>
              <DialogDescription>
                よく使う投稿文や設定をテンプレートとして保存します
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">テンプレート名 *</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="例: 施工事例投稿テンプレート"
                />
              </div>

              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, description: e.target.value })
                  }
                  placeholder="このテンプレートの用途や特徴を入力"
                />
              </div>

              <div>
                <Label htmlFor="companyName">会社名</Label>
                <Select
                  value={newTemplate.companyName}
                  onValueChange={(value: "ハゼモト建設" | "クリニックアーキプロ") =>
                    setNewTemplate({ ...newTemplate, companyName: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ハゼモト建設">ハゼモト建設</SelectItem>
                    <SelectItem value="クリニックアーキプロ">
                      クリニックアーキプロ
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="defaultPostTime">デフォルト投稿時刻</Label>
                <Input
                  id="defaultPostTime"
                  type="time"
                  value={newTemplate.defaultPostTime}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, defaultPostTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Instagram</h3>
                <div>
                  <Label htmlFor="instagramCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="instagramCaption"
                    value={newTemplate.instagramCaption}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        instagramCaption: e.target.value,
                      })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="instagramHashtags">ハッシュタグ</Label>
                  <Input
                    id="instagramHashtags"
                    value={newTemplate.instagramHashtags}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        instagramHashtags: e.target.value,
                      })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">X (Twitter)</h3>
                <div>
                  <Label htmlFor="xCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="xCaption"
                    value={newTemplate.xCaption}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, xCaption: e.target.value })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="xHashtags">ハッシュタグ</Label>
                  <Input
                    id="xHashtags"
                    value={newTemplate.xHashtags}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, xHashtags: e.target.value })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Threads</h3>
                <div>
                  <Label htmlFor="threadsCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="threadsCaption"
                    value={newTemplate.threadsCaption}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        threadsCaption: e.target.value,
                      })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="threadsHashtags">ハッシュタグ</Label>
                  <Input
                    id="threadsHashtags"
                    value={newTemplate.threadsHashtags}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        threadsHashtags: e.target.value,
                      })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 編集ダイアログ */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>テンプレート編集</DialogTitle>
              <DialogDescription>
                テンプレートの内容を編集します
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">テンプレート名 *</Label>
                <Input
                  id="edit-name"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  placeholder="例: 施工事例投稿テンプレート"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">説明</Label>
                <Textarea
                  id="edit-description"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, description: e.target.value })
                  }
                  placeholder="このテンプレートの用途や特徴を入力"
                />
              </div>

              <div>
                <Label htmlFor="edit-companyName">会社名</Label>
                <Select
                  value={newTemplate.companyName}
                  onValueChange={(value: "ハゼモト建設" | "クリニックアーキプロ") =>
                    setNewTemplate({ ...newTemplate, companyName: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ハゼモト建設">ハゼモト建設</SelectItem>
                    <SelectItem value="クリニックアーキプロ">
                      クリニックアーキプロ
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-defaultPostTime">デフォルト投稿時刻</Label>
                <Input
                  id="edit-defaultPostTime"
                  type="time"
                  value={newTemplate.defaultPostTime}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, defaultPostTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Instagram</h3>
                <div>
                  <Label htmlFor="edit-instagramCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="edit-instagramCaption"
                    value={newTemplate.instagramCaption}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        instagramCaption: e.target.value,
                      })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-instagramHashtags">ハッシュタグ</Label>
                  <Input
                    id="edit-instagramHashtags"
                    value={newTemplate.instagramHashtags}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        instagramHashtags: e.target.value,
                      })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">X (Twitter)</h3>
                <div>
                  <Label htmlFor="edit-xCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="edit-xCaption"
                    value={newTemplate.xCaption}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, xCaption: e.target.value })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-xHashtags">ハッシュタグ</Label>
                  <Input
                    id="edit-xHashtags"
                    value={newTemplate.xHashtags}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, xHashtags: e.target.value })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Threads</h3>
                <div>
                  <Label htmlFor="edit-threadsCaption">投稿文テンプレート</Label>
                  <Textarea
                    id="edit-threadsCaption"
                    value={newTemplate.threadsCaption}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        threadsCaption: e.target.value,
                      })
                    }
                    placeholder="投稿文のテンプレートを入力"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-threadsHashtags">ハッシュタグ</Label>
                  <Input
                    id="edit-threadsHashtags"
                    value={newTemplate.threadsHashtags}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        threadsHashtags: e.target.value,
                      })
                    }
                    placeholder="#建築 #リフォーム #施工事例"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedTemplate(null);
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpdateTemplate}
                disabled={updateTemplateMutation.isPending}
              >
                {updateTemplateMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
