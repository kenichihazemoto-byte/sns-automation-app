import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy } from "lucide-react";
import { POST_TEMPLATES } from "@shared/templates";

export default function Templates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseTemplateId: "",
    opening: "",
    body: "",
    cta: "",
    hashtags: "",
    targetAudience: "",
  });

  const utils = trpc.useUtils();
  const { data: customTemplates, isLoading } = trpc.customTemplates.list.useQuery();

  const createMutation = trpc.customTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを作成しました");
      utils.customTemplates.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const updateMutation = trpc.customTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを更新しました");
      utils.customTemplates.list.invalidate();
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const deleteMutation = trpc.customTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを削除しました");
      utils.customTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      baseTemplateId: "",
      opening: "",
      body: "",
      cta: "",
      hashtags: "",
      targetAudience: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.opening || !formData.body || !formData.cta) {
      toast.error("必須項目を入力してください");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      baseTemplateId: formData.baseTemplateId || undefined,
      structure: {
        opening: formData.opening,
        body: formData.body,
        cta: formData.cta,
      },
      hashtags: formData.hashtags.split(",").map(tag => tag.trim()).filter(tag => tag),
      targetAudience: formData.targetAudience || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingTemplate) return;

    updateMutation.mutate({
      id: editingTemplate.id,
      name: formData.name,
      description: formData.description,
      structure: {
        opening: formData.opening,
        body: formData.body,
        cta: formData.cta,
      },
      hashtags: formData.hashtags.split(",").map(tag => tag.trim()).filter(tag => tag),
      targetAudience: formData.targetAudience || undefined,
    });
  };

  const handleEdit = (template: any) => {
    const structure = JSON.parse(template.structure);
    setFormData({
      name: template.name,
      description: template.description || "",
      baseTemplateId: template.baseTemplateId || "",
      opening: structure.opening,
      body: structure.body,
      cta: structure.cta,
      hashtags: template.hashtags,
      targetAudience: template.targetAudience || "",
    });
    setEditingTemplate(template);
  };

  const handleCopyFromDefault = (templateId: string) => {
    const template = POST_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setFormData({
      ...formData,
      name: `${template.name}（カスタム）`,
      baseTemplateId: template.id,
      opening: template.structure.opening,
      body: template.structure.body,
      cta: template.structure.cta,
      hashtags: template.recommendedHashtags.join(", "),
      targetAudience: template.companyName,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("このテンプレートを削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">投稿テンプレート</h1>
            <p className="text-muted-foreground mt-2">
              投稿文の文章構成とハッシュタグをカスタマイズできます
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>テンプレートを作成</DialogTitle>
                <DialogDescription>
                  投稿文の文章構成とハッシュタグを設定してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">テンプレート名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: 新築完成（カスタム）"
                  />
                </div>
                <div>
                  <Label htmlFor="description">説明</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="このテンプレートの用途を説明"
                  />
                </div>
                <div>
                  <Label htmlFor="opening">冒頭文 *</Label>
                  <Textarea
                    id="opening"
                    value={formData.opening}
                    onChange={(e) => setFormData({ ...formData, opening: e.target.value })}
                    placeholder="投稿の冒頭部分（例: 新築住宅が完成しました！）"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="body">本文 *</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="投稿の本文部分（例: この空間で...）"
                    rows={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cta">CTA（行動喚起） *</Label>
                  <Textarea
                    id="cta"
                    value={formData.cta}
                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                    placeholder="投稿の締めくくり（例: お気軽にお問い合わせください）"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="hashtags">ハッシュタグ（カンマ区切り）</Label>
                  <Textarea
                    id="hashtags"
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    placeholder="例: 注文住宅, 北九州新築, 北九州工務店"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="targetAudience">ターゲット</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    placeholder="例: ハゼモト建設"
                  />
                </div>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "作成中..." : "作成"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* デフォルトテンプレート */}
        <div>
          <h2 className="text-xl font-semibold mb-4">デフォルトテンプレート</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POST_TEMPLATES.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">対象:</span> {template.companyName}
                    </div>
                    <div>
                      <span className="font-semibold">ハッシュタグ:</span> {template.recommendedHashtags.slice(0, 3).join(", ")}...
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => handleCopyFromDefault(template.id)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    コピーして編集
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* カスタムテンプレート */}
        <div>
          <h2 className="text-xl font-semibold mb-4">カスタムテンプレート</h2>
          {isLoading ? (
            <p>読み込み中...</p>
          ) : customTemplates && customTemplates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((template) => {
                const structure = JSON.parse(template.structure);
                return (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>{template.description || "説明なし"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        <div>
                          <span className="font-semibold">冒頭:</span> {structure.opening.substring(0, 30)}...
                        </div>
                        <div>
                          <span className="font-semibold">ハッシュタグ:</span> {template.hashtags.split(", ").slice(0, 3).join(", ")}...
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              編集
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>テンプレートを編集</DialogTitle>
                              <DialogDescription>
                                投稿文の文章構成とハッシュタグを編集してください
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">テンプレート名 *</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-description">説明</Label>
                                <Input
                                  id="edit-description"
                                  value={formData.description}
                                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-opening">冒頭文 *</Label>
                                <Textarea
                                  id="edit-opening"
                                  value={formData.opening}
                                  onChange={(e) => setFormData({ ...formData, opening: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-body">本文 *</Label>
                                <Textarea
                                  id="edit-body"
                                  value={formData.body}
                                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                  rows={5}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-cta">CTA（行動喚起） *</Label>
                                <Textarea
                                  id="edit-cta"
                                  value={formData.cta}
                                  onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-hashtags">ハッシュタグ（カンマ区切り）</Label>
                                <Textarea
                                  id="edit-hashtags"
                                  value={formData.hashtags}
                                  onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-targetAudience">ターゲット</Label>
                                <Input
                                  id="edit-targetAudience"
                                  value={formData.targetAudience}
                                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                />
                              </div>
                              <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
                                {updateMutation.isPending ? "更新中..." : "更新"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  カスタムテンプレートがありません。「新規作成」ボタンから作成してください。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
