import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

interface TaskChecklistProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string) => void;
}

export function TaskChecklist({ tasks, onTaskToggle }: TaskChecklistProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>今日のタスク</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount} / {totalCount} 完了
          </span>
        </CardTitle>
        <CardDescription>
          やるべきことをチェックしていきましょう
        </CardDescription>
        
        {/* 進捗バー */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent",
                task.completed && "bg-muted/50"
              )}
              onClick={() => onTaskToggle?.(task.id)}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {completedCount === totalCount && totalCount > 0 && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-primary font-semibold">🎉 すべてのタスクが完了しました！</p>
            <p className="text-sm text-muted-foreground mt-1">お疲れ様でした</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
