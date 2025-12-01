import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, dateFnsLocalizer, Event as BigCalendarEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ja } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Instagram, Twitter, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

const locales = {
  ja: ja,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent extends BigCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    platform: string;
    status: string;
    content: string;
    companyName: string;
  };
}

export default function PostCalendar() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: scheduledPosts, isLoading } = trpc.scheduler.listScheduledPosts.useQuery();

  const updateScheduleMutation = trpc.scheduler.updateScheduledPost.useMutation({
    onSuccess: () => {
      utils.scheduler.listScheduledPosts.invalidate();
      toast.success("投稿スケジュールを更新しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const events: CalendarEvent[] = useMemo(() => {
    if (!scheduledPosts) return [];

    return scheduledPosts
      .filter((post) => {
        if (platformFilter === "all") return true;
        return post.platform === platformFilter;
      })
      .map((post) => ({
        id: post.id,
        title: `${post.platform} - ${post.companyName}`,
        start: new Date(post.scheduledAt),
        end: new Date(new Date(post.scheduledAt).getTime() + 60 * 60 * 1000), // 1時間後
        resource: {
          platform: post.platform,
          status: post.status,
          content: post.content,
          companyName: post.companyName,
        },
      }));
  }, [scheduledPosts, platformFilter]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    ({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
      updateScheduleMutation.mutate({
        id: event.id,
        scheduledAt: typeof start === 'string' ? start : start.toISOString(),
      });
    },
    [updateScheduleMutation]
  );

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3b82f6"; // デフォルト: blue

    switch (event.resource.platform) {
      case "instagram":
        backgroundColor = "#e11d48"; // rose
        break;
      case "x":
        backgroundColor = "#0f172a"; // slate
        break;
      case "threads":
        backgroundColor = "#8b5cf6"; // violet
        break;
    }

    if (event.resource.status === "posted") {
      backgroundColor = "#22c55e"; // green
    } else if (event.resource.status === "draft") {
      backgroundColor = "#94a3b8"; // slate-400
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      case "x":
        return <Twitter className="h-4 w-4" />;
      case "threads":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="default">予約済み</Badge>;
      case "posted":
        return <Badge className="bg-green-500">投稿済み</Badge>;
      case "draft":
        return <Badge variant="secondary">下書き</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">投稿カレンダー</h1>
            <p className="text-muted-foreground mt-2">予約投稿のスケジュールを管理します</p>
          </div>
          <div className="flex gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="プラットフォーム" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="x">X (Twitter)</SelectItem>
                <SelectItem value="threads">Threads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>カレンダービュー</CardTitle>
            <CardDescription>投稿をドラッグ&ドロップしてスケジュールを変更できます</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div style={{ height: "600px" }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  onView={(newView) => setView(newView as "month" | "week" | "day")}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventStyleGetter}
                  culture="ja"
                  messages={{
                    next: "次へ",
                    previous: "前へ",
                    today: "今日",
                    month: "月",
                    week: "週",
                    day: "日",
                    agenda: "予定",
                    date: "日付",
                    time: "時間",
                    event: "イベント",
                    noEventsInRange: "この期間には投稿がありません",
                    showMore: (total) => `+${total} 件`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>凡例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-600"></div>
                <span className="text-sm">Instagram</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-900"></div>
                <span className="text-sm">X (Twitter)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-violet-600"></div>
                <span className="text-sm">Threads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm">投稿済み</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-400"></div>
                <span className="text-sm">下書き</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getPlatformIcon(selectedEvent.resource.platform)}
              投稿詳細
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && format(selectedEvent.start, "yyyy年MM月dd日 HH:mm")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">会社名</h3>
                <p>{selectedEvent.resource.companyName}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">プラットフォーム</h3>
                <div className="flex items-center gap-2">
                  {getPlatformIcon(selectedEvent.resource.platform)}
                  <span className="capitalize">{selectedEvent.resource.platform}</span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">ステータス</h3>
                {getStatusBadge(selectedEvent.resource.status)}
              </div>
              <div>
                <h3 className="font-semibold mb-2">投稿内容</h3>
                <p className="whitespace-pre-wrap text-sm">{selectedEvent.resource.content}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
