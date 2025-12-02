import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Edit, Eye, Instagram, Twitter, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function PostDrafts() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<number | null>(null);

  const { data: drafts, isLoading, refetch } = trpc.postDrafts.list.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteMutation = trpc.postDrafts.delete.useMutation({
    onSuccess: () => {
      toast.success("下書きを削除しました");
      refetch();
      setShowDeleteDialog(false);
      setDraftToDelete(null);
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const handleDelete = (id: number) => {
    setDraftToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (draftToDelete) {
      deleteMutation.mutate({ id: draftToDelete });
    }
  };

  const handleView = (draft: any) => {
    setSelectedDraft(draft);
    setShowDetailDialog(true);
  };

  const handleEdit = (draft: any) => {
    // AI投稿生成ページに遷移して、下書きデータを読み込む
    setLocation(`/demo?draftId=${draft.id}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>下書き一覧を表示するにはログインしてください。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">下書き一覧</h1>
        <p className="text-muted-foreground">
          保存した下書きを確認・編集・削除できます。
        </p>
      </div>

      {!drafts || drafts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>下書きがありません</CardTitle>
            <CardDescription>
              AI投稿生成ページで投稿を作成し、「下書き保存」ボタンをクリックすると、ここに表示されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/demo")}>
              AI投稿生成ページへ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <Card key={draft.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {draft.title || "無題の下書き"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {draft.companyName}
                    </CardDescription>
                  </div>
                  {draft.isBeforeAfter && (
                    <Badge variant="secondary">ビフォーアフター</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* 画像プレビュー */}
                  {draft.isBeforeAfter ? (
                    <div className="grid grid-cols-2 gap-2">
                      {draft.beforeImageUrl && (
                        <img
                          src={draft.beforeImageUrl}
                          alt="Before"
                          className="w-full h-24 object-cover rounded"
                        />
                      )}
                      {draft.afterImageUrl && (
                        <img
                          src={draft.afterImageUrl}
                          alt="After"
                          className="w-full h-24 object-cover rounded"
                        />
                      )}
                    </div>
                  ) : (
                    draft.imageUrl && (
                      <img
                        src={draft.imageUrl}
                        alt="Post"
                        className="w-full h-32 object-cover rounded"
                      />
                    )
                  )}

                  {/* プラットフォームバッジ */}
                  <div className="flex gap-2 flex-wrap">
                    {draft.instagramContent && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Instagram className="w-3 h-3" />
                        Instagram
                      </Badge>
                    )}
                    {draft.xContent && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Twitter className="w-3 h-3" />
                        X
                      </Badge>
                    )}
                    {draft.threadsContent && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Threads
                      </Badge>
                    )}
                  </div>

                  {/* 更新日時 */}
                  <p className="text-xs text-muted-foreground">
                    更新: {new Date(draft.updatedAt).toLocaleString("ja-JP")}
                  </p>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(draft)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      詳細
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(draft)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(draft.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 詳細表示ダイアログ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDraft?.title || "無題の下書き"}
            </DialogTitle>
            <DialogDescription>
              {selectedDraft?.companyName}
              {selectedDraft?.isBeforeAfter && " - ビフォーアフター投稿"}
            </DialogDescription>
          </DialogHeader>

          {selectedDraft && (
            <div className="space-y-4">
              {/* 画像 */}
              {selectedDraft.isBeforeAfter ? (
                <div className="grid grid-cols-2 gap-4">
                  {selectedDraft.beforeImageUrl && (
                    <div>
                      <p className="text-sm font-medium mb-2">ビフォー</p>
                      <img
                        src={selectedDraft.beforeImageUrl}
                        alt="Before"
                        className="w-full rounded"
                      />
                    </div>
                  )}
                  {selectedDraft.afterImageUrl && (
                    <div>
                      <p className="text-sm font-medium mb-2">アフター</p>
                      <img
                        src={selectedDraft.afterImageUrl}
                        alt="After"
                        className="w-full rounded"
                      />
                    </div>
                  )}
                </div>
              ) : (
                selectedDraft.imageUrl && (
                  <img
                    src={selectedDraft.imageUrl}
                    alt="Post"
                    className="w-full rounded"
                  />
                )
              )}

              {/* Instagram */}
              {selectedDraft.instagramContent && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold">Instagram</h3>
                  </div>
                  <p className="whitespace-pre-wrap mb-2">{selectedDraft.instagramContent}</p>
                  {selectedDraft.instagramHashtags && (
                    <p className="text-blue-600">{selectedDraft.instagramHashtags}</p>
                  )}
                </div>
              )}

              {/* X */}
              {selectedDraft.xContent && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold">X (Twitter)</h3>
                  </div>
                  <p className="whitespace-pre-wrap mb-2">{selectedDraft.xContent}</p>
                  {selectedDraft.xHashtags && (
                    <p className="text-blue-600">{selectedDraft.xHashtags}</p>
                  )}
                </div>
              )}

              {/* Threads */}
              {selectedDraft.threadsContent && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold">Threads</h3>
                  </div>
                  <p className="whitespace-pre-wrap mb-2">{selectedDraft.threadsContent}</p>
                  {selectedDraft.threadsHashtags && (
                    <p className="text-blue-600">{selectedDraft.threadsHashtags}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              閉じる
            </Button>
            <Button onClick={() => {
              setShowDetailDialog(false);
              handleEdit(selectedDraft);
            }}>
              編集する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>下書きを削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。本当に削除してもよろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
