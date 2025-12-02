import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TemplateSelectorProps {
  companyName: "ハゼモト建設" | "クリニックアーキプロ";
  onApplyTemplate: (template: any) => void;
}

export default function TemplateSelector({ companyName, onApplyTemplate }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // テンプレート一覧を取得
  const { data: templates, isLoading } = trpc.postTemplates.list.useQuery();

  // 会社名でフィルタリング
  const filteredTemplates = templates?.filter(t => t.companyName === companyName) || [];

  const handleApply = () => {
    if (!selectedTemplateId) {
      toast.error("テンプレートを選択してください");
      return;
    }

    const template = filteredTemplates.find(t => t.id === parseInt(selectedTemplateId));
    if (template) {
      onApplyTemplate(template);
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

  if (filteredTemplates.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p className="mb-2">この会社のテンプレートがありません</p>
        <p className="text-sm">テンプレート管理ページで作成してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
        <SelectTrigger>
          <SelectValue placeholder="テンプレートを選択" />
        </SelectTrigger>
        <SelectContent>
          {filteredTemplates.map((template) => (
            <SelectItem key={template.id} value={template.id.toString()}>
              {template.name}
              {template.description && ` - ${template.description}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        onClick={handleApply}
        disabled={!selectedTemplateId}
        className="w-full"
      >
        テンプレートを適用
      </Button>
    </div>
  );
}
