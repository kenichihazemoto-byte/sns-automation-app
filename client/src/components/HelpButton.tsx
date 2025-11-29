import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface HelpButtonProps {
  title: string;
  content: string | React.ReactNode;
}

export function HelpButton({ title, content }: HelpButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label="ヘルプ"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <div className="text-sm text-muted-foreground">
            {typeof content === "string" ? <p>{content}</p> : content}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
