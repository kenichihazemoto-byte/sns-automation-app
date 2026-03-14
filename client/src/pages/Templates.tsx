import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Copy, X, ArrowUp, ArrowDown } from "lucide-react";
import { POST_TEMPLATES, BUSINESS_UNITS, getTemplatesGroupedByBusinessUnit, type PostTemplate } from "@shared/templates";

export default function Templates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<"ハゼモト建設" | "クリニックアーキプロ">("ハゼモト建設");
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
  const [selectedDataSources, setSelectedDataSources] = useState<Array<{ id: number; name: string; priority: number }>>([]);
  const [currentDataSourceId, setCurrentDataSourceId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: customTemplates, isLoading } = trpc.customTemplates.list.useQuery();
  const { data: dataSources } = trpc.dataSources.list.useQuery();

  const createMutation = trpc.customTemplates.create.useMutation({
    onSuccess: async (result) => {
      if (selectedDataSources.length > 0 && result.id) {
        await linkDataSourcesMutation.mutateAsync({
          templateId: result.id,
          dataSourceIds: selectedDataSources.map(ds => ds.id),
        });
      }
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
    onSuccess: async () => {
      if (editingTemplate && selectedDataSources.length > 0) {
        await linkDataSourcesMutation.mutateAsync({
          templateId: editingTemplate.id,
          dataSourceIds: selectedDataSources.map(ds => ds.id),
        });
      }
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

  const linkDataSourcesMutation = trpc.customTemplates.linkDataSources.useMutation({
    onError: (error) => {
      toast.error(`接続先の紐付けエラー: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", baseTemplateId: "", opening: "", body: "", cta: "", hashtags: "", targetAudience: "" });
    setSelectedDataSources([]);
    setCurrentDataSourceId("");
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
      structure: { opening: formData.opening, body: formData.body, cta: formData.cta },
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
      structure: { opening: formData.opening, body: formData.body, cta: formData.cta },
      hashtags: formData.hashtags.split(",").map(tag => tag.trim()).filter(tag => tag),
      targetAudience: formData.targetAudience || undefined,
    });
  };

  const handleEdit = async (template: any) => {
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
    try {
      const linkedDataSources = await utils.client.customTemplates.getLinkedDataSources.query({ templateId: template.id });
      setSelectedDataSources(linkedDataSources.map((ds: any, index: number) => ({ id: ds.id, name: ds.name, priority: index })));
    } catch {
      setSelectedDataSources([]);
    }
    setEditingTemplate(template);
  };

  const handleCopyFromDefault = (template: PostTemplate) => {
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

  const handleAddDataSource = () => {
    if (!currentDataSourceId) return;
    const dataSource = dataSources?.find(ds => ds.id === parseInt(currentDataSourceId));
    if (!dataSource) return;
    if (selectedDataSources.some(ds => ds.id === dataSource.id)) {
      toast.error("この接続先は既に追加されています");
      return;
    }
    setSelectedDataSources([...selectedDataSources, { id: dataSource.id, name: dataSource.name, priority: selectedDataSources.length }]);
    setCurrentDataSourceId("");
  };

  const handleRemoveDataSource = (id: number) => {
    setSelectedDataSources(selectedDataSources.filter(ds => ds.id !== id).map((ds, index) => ({ ...ds, priority: index })));
  };

  const handleMovePriority = (id: number, direction: "up" | "down") => {
    const index = selectedDataSources.findIndex(ds => ds.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === selectedDataSources.length - 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newList = [...selectedDataSources];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setSelectedDataSources(newList.map((ds, i) => ({ ...ds, priority: i })));
  };

  const renderDataSourceSelector = () => (
    <div className="space-y-4">
      <div>
        <Label>写真データ接続先</Label>
        <p className="text-sm text-muted-foreground mb-2">このテンプレートで使用する写真の取得元を選択してください。</p>
        <div className="flex gap-2">
          <Select value={currentDataSourceId} onValueChange={setCurrentDataSourceId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="接続先を選択" />
            </SelectTrigger>
            <SelectContent>
              {dataSources?.map((ds) => (
                <SelectItem key={ds.id} value={ds.id.toString()}>{ds.name} ({ds.provider})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAddDataSource} disabled={!currentDataSourceId}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectedDataSources.length > 0 && (
        <div className="space-y-2">
          <Label>選択された接続先（優先順位順）</Label>
          <div className="space-y-2">
            {selectedDataSources.map((ds, index) => (
              <div key={ds.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <div className="flex flex-col gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-4 w-6 p-0" onClick={() => handleMovePriority(ds.id, "up")} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button>
                  <Button type="button" variant="ghost" size="sm" className="h-4 w-6 p-0" onClick={() => handleMovePriority(ds.id, "down")} disabled={index === selectedDataSources.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                </div>
                <Badge variant="outline" className="font-mono">{index + 1}</Badge>
                <span className="flex-1">{ds.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveDataSource(ds.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTemplateForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor={isEdit ? "edit-name" : "name"}>テンプレート名 *</Label>
        <Input id={isEdit ? "edit-name" : "name"} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例: 施工事例投稿テンプレート" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-description" : "description"}>説明</Label>
        <Input id={isEdit ? "edit-description" : "description"} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="このテンプレートの用途や特徴" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-opening" : "opening"}>冒頭文 *</Label>
        <Textarea id={isEdit ? "edit-opening" : "opening"} value={formData.opening} onChange={(e) => setFormData({ ...formData, opening: e.target.value })} rows={3} placeholder="投稿の書き出し・冒頭の構成指示" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-body" : "body"}>本文 *</Label>
        <Textarea id={isEdit ? "edit-body" : "body"} value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={5} placeholder="本文の構成指示・盛り込む内容" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-cta" : "cta"}>CTA（行動喚起） *</Label>
        <Textarea id={isEdit ? "edit-cta" : "cta"} value={formData.cta} onChange={(e) => setFormData({ ...formData, cta: e.target.value })} rows={2} placeholder="締めの言葉・問い合わせへの誘導" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-hashtags" : "hashtags"}>ハッシュタグ（カンマ区切り）</Label>
        <Textarea id={isEdit ? "edit-hashtags" : "hashtags"} value={formData.hashtags} onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })} rows={3} placeholder="例: 注文住宅, 北九州新築, 北九州工務店" />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-targetAudience" : "targetAudience"}>ターゲット</Label>
        <Input id={isEdit ? "edit-targetAudience" : "targetAudience"} value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} placeholder="例: ハゼモト建設" />
      </div>
      {renderDataSourceSelector()}
      <Button onClick={isEdit ? handleUpdate : handleCreate} disabled={isEdit ? updateMutation.isPending : createMutation.isPending} className="w-full">
        {isEdit ? (updateMutation.isPending ? "更新中..." : "更新") : (createMutation.isPending ? "作成中..." : "作成")}
      </Button>
    </div>
  );

  // 会社別の事業区分を取得
  const hazemotoUnits = BUSINESS_UNITS.filter(u => u.companyName === "ハゼモト建設");
  const clinicUnits = BUSINESS_UNITS.filter(u => u.companyName === "クリニックアーキプロ");
  const hazemotoGrouped = getTemplatesGroupedByBusinessUnit("ハゼモト建設");
  const clinicGrouped = getTemplatesGroupedByBusinessUnit("クリニックアーキプロ");

  const renderTemplateCard = (template: PostTemplate) => (
    <Card key={template.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{template.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground mb-3 line-clamp-2 bg-muted/50 rounded p-2 font-mono">
          {template.sampleText.substring(0, 80)}...
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {template.recommendedHashtags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">#{tag.replace(/^#/, "")}</span>
          ))}
          {template.recommendedHashtags.length > 4 && (
            <span className="text-xs text-muted-foreground">+{template.recommendedHashtags.length - 4}個</span>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={() => handleCopyFromDefault(template)}>
          <Copy className="mr-2 h-3 w-3" />
          コピーしてカスタマイズ
        </Button>
      </CardContent>
    </Card>
  );

  const renderBusinessUnitSection = (units: typeof BUSINESS_UNITS, grouped: Record<string, PostTemplate[]>) => (
    <div className="space-y-8">
      {units.map(unit => {
        const templates = grouped[unit.id] || [];
        return (
          <div key={unit.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{unit.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{unit.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${unit.color} ${unit.textColor}`}>
                    {templates.length}件
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{unit.description}</p>
              </div>
            </div>
            {templates.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(renderTemplateCard)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                このカテゴリのテンプレートはまだありません
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">投稿テンプレート</h1>
            <p className="text-muted-foreground mt-1">
              事業別・カテゴリ別に整理された投稿テンプレート集。コピーしてカスタマイズできます。
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                新規テンプレート作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新規テンプレート作成</DialogTitle>
                <DialogDescription>投稿文の文章構成とハッシュタグを設定してください</DialogDescription>
              </DialogHeader>
              {renderTemplateForm(false)}
            </DialogContent>
          </Dialog>
        </div>

        {/* 会社タブ */}
        <Tabs value={selectedCompany} onValueChange={(v) => setSelectedCompany(v as any)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ハゼモト建設" className="flex items-center gap-2">
              🏠 ハゼモト建設
            </TabsTrigger>
            <TabsTrigger value="クリニックアーキプロ" className="flex items-center gap-2">
              🏥 クリニックアーキプロ
            </TabsTrigger>
          </TabsList>

          {/* ハゼモト建設 */}
          <TabsContent value="ハゼモト建設" className="mt-6">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h2 className="font-semibold text-amber-900 mb-1">🏠 ハゼモト建設のテンプレート</h2>
              <p className="text-sm text-amber-700">
                建設本業・ラトリエルアッシュ（パン屋）・子ども食堂・就労支援B型の4事業に分類されています。
                各テンプレートは「コピーしてカスタマイズ」から独自のテンプレートとして保存できます。
              </p>
            </div>
            {renderBusinessUnitSection(hazemotoUnits, hazemotoGrouped)}
          </TabsContent>

          {/* クリニックアーキプロ */}
          <TabsContent value="クリニックアーキプロ" className="mt-6">
            <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <h2 className="font-semibold text-teal-900 mb-1">🏥 クリニックアーキプロのテンプレート</h2>
              <p className="text-sm text-teal-700">
                診療案内・健康情報・スタッフ紹介の3カテゴリに分類されています。
                各テンプレートは「コピーしてカスタマイズ」から独自のテンプレートとして保存できます。
              </p>
            </div>
            {renderBusinessUnitSection(clinicUnits, clinicGrouped)}
          </TabsContent>
        </Tabs>

        {/* カスタムテンプレート */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">カスタムテンプレート</h2>
              <p className="text-sm text-muted-foreground">上のテンプレートをコピーして作成した、あなた独自のテンプレートです</p>
            </div>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">読み込み中...</p>
          ) : customTemplates && customTemplates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((template) => {
                const structure = JSON.parse(template.structure);
                return (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description || "説明なし"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm mb-4">
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <span className="font-semibold">冒頭:</span> {structure.opening.substring(0, 40)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold">ハッシュタグ:</span> {template.hashtags.split(", ").slice(0, 3).join(", ")}...
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(template)}>
                              <Edit className="mr-2 h-4 w-4" />
                              編集
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>テンプレートを編集</DialogTitle>
                              <DialogDescription>投稿文の文章構成とハッシュタグを編集してください</DialogDescription>
                            </DialogHeader>
                            {renderTemplateForm(true)}
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(template.id)} disabled={deleteMutation.isPending}>
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
                <p className="text-center text-muted-foreground text-sm">
                  カスタムテンプレートがありません。<br />
                  上のテンプレートから「コピーしてカスタマイズ」ボタンで作成できます。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
