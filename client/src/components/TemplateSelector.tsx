import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronRight, Eye, Instagram, Twitter, MessageSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface TemplateSelectorProps {
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
  onApplyTemplate: (template: any) => void;
}

// 事業区分の表示設定
const BUSINESS_UNIT_CONFIG: Record<string, { icon: string; color: string }> = {
  "建設本業": { icon: "🏗️", color: "bg-blue-100 text-blue-800" },
  "ラトリエルアッシュ": { icon: "🍞", color: "bg-amber-100 text-amber-800" },
  "子ども食堂": { icon: "🍚", color: "bg-green-100 text-green-800" },
  "就労支援B型": { icon: "🤝", color: "bg-purple-100 text-purple-800" },
  "診療案内": { icon: "🏥", color: "bg-red-100 text-red-800" },
  "健康情報": { icon: "💊", color: "bg-teal-100 text-teal-800" },
  "スタッフ紹介": { icon: "👩‍⚕️", color: "bg-pink-100 text-pink-800" },
};

export default function TemplateSelector({ companyName, onApplyTemplate }: TemplateSelectorProps) {
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // テンプレート一覧を取得
  const { data: templates, isLoading, error } = trpc.postTemplates.list.useQuery();

  // 会社名でフィルタリング
  const companyTemplates = useMemo(
    () => templates?.filter(t => t.companyName === companyName) || [],
    [templates, companyName]
  );

  // 事業区分の一覧を抽出（重複排除・順序保持）
  const businessUnits = useMemo(() => {
    const seen = new Set<string>();
    const units: string[] = [];
    for (const t of companyTemplates) {
      const unit = t.businessUnit || "その他";
      if (!seen.has(unit)) {
        seen.add(unit);
        units.push(unit);
      }
    }
    return units;
  }, [companyTemplates]);

  // 事業区分でフィルタリングしたテンプレート
  const filteredTemplates = useMemo(() => {
    if (!selectedBusinessUnit) return companyTemplates;
    return companyTemplates.filter(t => (t.businessUnit || "その他") === selectedBusinessUnit);
  }, [companyTemplates, selectedBusinessUnit]);

  // 現在選択中のテンプレート
  const selectedTemplate = useMemo(
    () => filteredTemplates.find(t => t.id === parseInt(selectedTemplateId)),
    [filteredTemplates, selectedTemplateId]
  );

  // 事業区分が変わったらテンプレート選択をリセット
  const handleBusinessUnitChange = (unit: string) => {
    setSelectedBusinessUnit(unit === "__all__" ? "" : unit);
    setSelectedTemplateId("");
  };

  const handleApply = () => {
    if (!selectedTemplateId) {
      toast.error("テンプレートを選択してください");
      return;
    }
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
      setPreviewOpen(false);
      toast.success("テンプレートを適用しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-4">
        <p className="mb-2">エラーが発生しました</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (companyTemplates.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p className="mb-2">この会社のテンプレートがありません</p>
        <p className="text-sm">テンプレート管理ページで作成してください</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Step 1: 事業区分フィルター */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">① 事業区分を選択</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleBusinessUnitChange("__all__")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                !selectedBusinessUnit
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}
            >
              すべて ({companyTemplates.length})
            </button>
            {businessUnits.map(unit => {
              const config = BUSINESS_UNIT_CONFIG[unit] || { icon: "📋", color: "bg-gray-100 text-gray-800" };
              const count = companyTemplates.filter(t => (t.businessUnit || "その他") === unit).length;
              const isSelected = selectedBusinessUnit === unit;
              return (
                <button
                  key={unit}
                  onClick={() => handleBusinessUnitChange(unit)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {config.icon} {unit} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: テンプレート選択 */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">② テンプレートを選択</p>
          <Select
            value={selectedTemplateId}
            onValueChange={(val) => {
              setSelectedTemplateId(val);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={`テンプレートを選択 (${filteredTemplates.length}件)`} />
            </SelectTrigger>
            <SelectContent>
              {filteredTemplates.map((template) => {
                const unit = template.businessUnit || "その他";
                const config = BUSINESS_UNIT_CONFIG[unit] || { icon: "📋", color: "" };
                return (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <span className="flex items-center gap-1.5">
                      <span>{config.icon}</span>
                      <span>{template.name}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* 選択後：説明文 + プレビューボタン */}
          {selectedTemplate && (
            <div className="flex items-start justify-between gap-2 px-1">
              <p className="text-xs text-muted-foreground flex-1">
                {selectedTemplate.description || ""}
              </p>
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
              >
                <Eye className="w-3 h-3" />
                サンプル文を見る
              </button>
            </div>
          )}
        </div>

        {/* 適用ボタン */}
        <Button
          onClick={handleApply}
          disabled={!selectedTemplateId}
          className="w-full"
          size="sm"
        >
          <ChevronRight className="w-4 h-4 mr-1" />
          テンプレートを適用
        </Button>
      </div>

      {/* サンプル文プレビューダイアログ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedTemplate && (() => {
                const unit = selectedTemplate.businessUnit || "その他";
                const config = BUSINESS_UNIT_CONFIG[unit] || { icon: "📋", color: "" };
                return <span>{config.icon} {selectedTemplate.name}</span>;
              })()}
            </DialogTitle>
            {selectedTemplate?.description && (
              <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
            )}
          </DialogHeader>

          {selectedTemplate && (
            <Tabs defaultValue="instagram" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="instagram" className="flex-1 text-xs">
                  <Instagram className="w-3 h-3 mr-1" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="x" className="flex-1 text-xs">
                  <Twitter className="w-3 h-3 mr-1" />
                  X
                </TabsTrigger>
                <TabsTrigger value="threads" className="flex-1 text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Threads
                </TabsTrigger>
              </TabsList>

              <TabsContent value="instagram" className="mt-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">本文</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedTemplate.instagramCaption || "（未設定）"}
                  </pre>
                  {selectedTemplate.instagramHashtags && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground pt-1">ハッシュタグ</p>
                      <p className="text-xs text-primary">{selectedTemplate.instagramHashtags}</p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="x" className="mt-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">本文</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedTemplate.xCaption || "（未設定）"}
                  </pre>
                  {selectedTemplate.xHashtags && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground pt-1">ハッシュタグ</p>
                      <p className="text-xs text-primary">{selectedTemplate.xHashtags}</p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="threads" className="mt-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">本文</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedTemplate.threadsCaption || "（未設定）"}
                  </pre>
                  {selectedTemplate.threadsHashtags && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground pt-1">ハッシュタグ</p>
                      <p className="text-xs text-primary">{selectedTemplate.threadsHashtags}</p>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
              閉じる
            </Button>
            <Button size="sm" onClick={handleApply}>
              <ChevronRight className="w-4 h-4 mr-1" />
              このテンプレートを適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
