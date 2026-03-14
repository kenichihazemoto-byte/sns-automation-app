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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BUSINESS_UNITS } from "@shared/templates";

export default function PostTemplates() {
  const { user, loading: authLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<"ハゼモト建設" | "クリニックアーキプロ">("ハゼモト建設");

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
    businessUnit: "建設本業",
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
      businessUnit: template.businessUnit || "建設本業",
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
      businessUnit: "建設本業",
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

  // 会社別・事業区分別にテンプレートをグループ化
  const hazemotoUnits = BUSINESS_UNITS.filter(u => u.companyName === "ハゼモト建設");
  const clinicUnits = BUSINESS_UNITS.filter(u => u.companyName === "クリニックアーキプロ");

  const getTemplatesByUnit = (companyName: string, unitId: string) => {
    return (templates || []).filter(
      t => t.companyName === companyName && (t as any).businessUnit === unitId
    );
  };

  const getTemplatesByCompany = (companyName: string) => {
    return (templates || []).filter(t => t.companyName === companyName);
  };

  // 事業区分のセレクトオプション
  const businessUnitOptions = BUSINESS_UNITS.filter(u => u.companyName === newTemplate.companyName);

  const renderTemplateCard = (template: any) => (
    <Card key={template.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{template.name}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditDialog(template)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteTemplate(template.id)}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="text-xs">{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">投稿タイプ:</span>
            <Badge variant="outline" className="text-xs">
              {template.isBeforeAfter ? "ビフォーアフター" : "通常投稿"}
            </Badge>
          </div>
          {template.defaultPostTime && (
            <div className="text-xs text-muted-foreground">
              デフォルト投稿時刻: {template.defaultPostTime}
            </div>
          )}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">設定済みプラットフォーム:</div>
            <div className="flex gap-1 flex-wrap">
              {template.instagramCaption && (
                <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-xs">
                  Instagram
                </span>
              )}
              {template.xCaption && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  X
                </span>
              )}
              {template.threadsCaption && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                  Threads
                </span>
              )}
              {!template.instagramCaption && !template.xCaption && !template.threadsCaption && (
                <span className="text-xs text-muted-foreground">未設定</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBusinessUnitSection = (units: typeof BUSINESS_UNITS, companyName: string) => (
    <div className="space-y-8">
      {units.map(unit => {
        const unitTemplates = getTemplatesByUnit(companyName, unit.id);
        return (
          <div key={unit.id}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{unit.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{unit.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${unit.color} ${unit.textColor}`}>
                    {unitTemplates.length}件
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{unit.description}</p>
              </div>
            </div>
            {unitTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitTemplates.map(renderTemplateCard)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                この事業区分のテンプレートはまだありません。
                <Button
                  variant="link"
                  size="sm"
                  className="ml-1 h-auto p-0"
                  onClick={() => {
                    resetForm();
                    setNewTemplate(prev => ({
                      ...prev,
                      companyName: companyName as any,
                      businessUnit: unit.id,
                    }));
                    setIsCreateDialogOpen(true);
                  }}
                >
                  作成する
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* 事業区分未設定のテンプレート */}
      {(() => {
        const uncategorized = getTemplatesByCompany(companyName).filter(
          t => !BUSINESS_UNITS.some(u => u.id === (t as any).businessUnit)
        );
        if (uncategorized.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">📋</span>
              <div>
                <h3 className="text-base font-semibold">その他</h3>
                <p className="text-xs text-muted-foreground">事業区分が未設定のテンプレート</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uncategorized.map(renderTemplateCard)}
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderTemplateForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">テンプレート名 *</Label>
        <Input
          id="name"
          value={newTemplate.name}
          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
          placeholder="例: 施工事例投稿テンプレート"
        />
      </div>
      <div>
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={newTemplate.description}
          onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
          placeholder="このテンプレートの用途や特徴を入力"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">会社名</Label>
          <Select
            value={newTemplate.companyName}
            onValueChange={(value: "ハゼモト建設" | "クリニックアーキプロ") =>
              setNewTemplate({ ...newTemplate, companyName: value, businessUnit: BUSINESS_UNITS.find(u => u.companyName === value)?.id || "" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ハゼモト建設">🏠 ハゼモト建設</SelectItem>
              <SelectItem value="クリニックアーキプロ">🏥 クリニックアーキプロ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="businessUnit">事業区分</Label>
          <Select
            value={newTemplate.businessUnit}
            onValueChange={(value) => setNewTemplate({ ...newTemplate, businessUnit: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="事業区分を選択" />
            </SelectTrigger>
            <SelectContent>
              {businessUnitOptions.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.icon} {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="defaultPostTime">デフォルト投稿時刻</Label>
        <Input
          id="defaultPostTime"
          type="time"
          value={newTemplate.defaultPostTime}
          onChange={(e) => setNewTemplate({ ...newTemplate, defaultPostTime: e.target.value })}
        />
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">📸 Instagram</h3>
        <div>
          <Label htmlFor="instagramCaption">投稿文テンプレート</Label>
          <Textarea
            id="instagramCaption"
            value={newTemplate.instagramCaption}
            onChange={(e) => setNewTemplate({ ...newTemplate, instagramCaption: e.target.value })}
            placeholder="投稿文のテンプレートを入力"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="instagramHashtags">ハッシュタグ</Label>
          <Input
            id="instagramHashtags"
            value={newTemplate.instagramHashtags}
            onChange={(e) => setNewTemplate({ ...newTemplate, instagramHashtags: e.target.value })}
            placeholder="#建築 #リフォーム #施工事例"
          />
        </div>
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">✖ X (Twitter)</h3>
        <div>
          <Label htmlFor="xCaption">投稿文テンプレート</Label>
          <Textarea
            id="xCaption"
            value={newTemplate.xCaption}
            onChange={(e) => setNewTemplate({ ...newTemplate, xCaption: e.target.value })}
            placeholder="投稿文のテンプレートを入力"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="xHashtags">ハッシュタグ</Label>
          <Input
            id="xHashtags"
            value={newTemplate.xHashtags}
            onChange={(e) => setNewTemplate({ ...newTemplate, xHashtags: e.target.value })}
            placeholder="#建築 #リフォーム #施工事例"
          />
        </div>
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">🧵 Threads</h3>
        <div>
          <Label htmlFor="threadsCaption">投稿文テンプレート</Label>
          <Textarea
            id="threadsCaption"
            value={newTemplate.threadsCaption}
            onChange={(e) => setNewTemplate({ ...newTemplate, threadsCaption: e.target.value })}
            placeholder="投稿文のテンプレートを入力"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="threadsHashtags">ハッシュタグ</Label>
          <Input
            id="threadsHashtags"
            value={newTemplate.threadsHashtags}
            onChange={(e) => setNewTemplate({ ...newTemplate, threadsHashtags: e.target.value })}
            placeholder="#建築 #リフォーム #施工事例"
          />
        </div>
      </div>
    </div>
  );

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
        {/* ヘッダー */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">予約投稿テンプレート</h1>
            <p className="text-muted-foreground mt-1">
              よく使う投稿文や設定をテンプレートとして保存できます。事業別に整理されています。
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

        {/* 会社タブ */}
        <Tabs value={selectedCompany} onValueChange={(v) => setSelectedCompany(v as any)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ハゼモト建設">🏠 ハゼモト建設</TabsTrigger>
            <TabsTrigger value="クリニックアーキプロ">🏥 クリニックアーキプロ</TabsTrigger>
          </TabsList>

          <TabsContent value="ハゼモト建設" className="mt-6">
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                建設本業・ラトリエルアッシュ・子ども食堂・就労支援B型の4事業に分類されています。
              </p>
            </div>
            {renderBusinessUnitSection(hazemotoUnits, "ハゼモト建設")}
          </TabsContent>

          <TabsContent value="クリニックアーキプロ" className="mt-6">
            <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm text-teal-700">
                診療案内・健康情報・スタッフ紹介の3カテゴリに分類されています。
              </p>
            </div>
            {renderBusinessUnitSection(clinicUnits, "クリニックアーキプロ")}
          </TabsContent>
        </Tabs>

        {/* 新規作成ダイアログ */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規テンプレート作成</DialogTitle>
              <DialogDescription>
                よく使う投稿文や設定をテンプレートとして保存します
              </DialogDescription>
            </DialogHeader>
            {renderTemplateForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
              <DialogDescription>テンプレートの内容を編集します</DialogDescription>
            </DialogHeader>
            {renderTemplateForm()}
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
              <Button onClick={handleUpdateTemplate} disabled={updateTemplateMutation.isPending}>
                {updateTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
