import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, CheckCircle, RefreshCw, Image as ImageIcon, Instagram, Twitter, MessageSquare, Save, Calendar, Download, Upload, Clock, GripVertical, Edit, BookOpen } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import TemplateSelector from "@/components/TemplateSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Sortable Photo Item Component
function SortablePhotoItem({ photo, index, selectedImage, onSelect, onEnlarge, onDelete, isSelected, onToggleSelect }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group border-2 rounded-lg overflow-hidden ${
        selectedImage?.id === photo.id ? "border-primary" : "border-transparent"
      }`}
    >
      {/* チェックボックス */}
      {onToggleSelect && (
        <div className="absolute top-2 left-2 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="h-5 w-5 cursor-pointer"
          />
        </div>
      )}
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-10 bg-background/80 p-1 rounded cursor-move z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <img
        src={photo.url}
        alt={`写真 ${index + 1}`}
        className="w-full h-32 object-cover cursor-pointer"
        onClick={onSelect}
      />
      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
        スコア: {photo.score?.toFixed(1) || 'N/A'}
      </div>
      {selectedImage?.id === photo.id && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
          <Check className="h-8 w-8 text-primary-foreground" />
        </div>
      )}
      {/* ホバー時のアクションボタン */}
      <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEnlarge();
          }}
        >
          拡大
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </Button>
      </div>
    </div>
  );
}

export default function Demo() {
  const [companyName, setCompanyName] = useState<"ハゼモト建設" | "クリニックアーキプロ">("ハゼモト建設");

  // テンプレート適用ハンドラー
  const handleApplyTemplate = (template: any) => {
    console.log("[handleApplyTemplate] template:", template);
    
    // allPlatformsPostsの形式に合わせて設定
    const newPosts = {
      instagram: {
        content: template.instagramCaption || "",
        hashtags: template.instagramHashtags || "",
        platform: "instagram" as const,
      },
      x: {
        content: template.xCaption || "",
        hashtags: template.xHashtags || "",
        platform: "x" as const,
      },
      threads: {
        content: template.threadsCaption || "",
        hashtags: template.threadsHashtags || "",
        platform: "threads" as const,
      },
    };
    
    console.log("[handleApplyTemplate] newPosts:", newPosts);
    setAllPlatformsPosts(newPosts);
    setContents(null); // contentsをクリア
    setBeforeAfterPost(null); // 単一プラットフォーム結果をクリア

    // デフォルト投稿時刻を適用
    if (template.defaultPostTime) {
      setScheduleTime(template.defaultPostTime);
    }
    
    toast.success("テンプレートを適用しました");
  };
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [contents, setContents] = useState<any>(null);
  const [individualComments, setIndividualComments] = useState<any>(null);
  const [carouselPost, setCarouselPost] = useState<any>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [photoCount, setPhotoCount] = useState<number>(5);
  const [multiplePhotos, setMultiplePhotos] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"single" | "individual" | "carousel">("single");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState<boolean>(false);
  const [beforeImage, setBeforeImage] = useState<any>(null);
  const [afterImage, setAfterImage] = useState<any>(null);
  const [beforeAfterPost, setBeforeAfterPost] = useState<any>(null);
  const [isBeforeAfterMode, setIsBeforeAfterMode] = useState<boolean>(false);
  const [beforeAfterPlatform, setBeforeAfterPlatform] = useState<"instagram" | "x" | "threads">("instagram");
  const [allPlatformsPosts, setAllPlatformsPosts] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"instagram" | "x" | "threads">("instagram");
  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false);
  const [showBatchScheduleDialog, setShowBatchScheduleDialog] = useState<boolean>(false);
  const [batchScheduleDate, setBatchScheduleDate] = useState<string>("");
  const [batchScheduleInterval, setBatchScheduleInterval] = useState<number>(1); // 時間間隔（時間単位）
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    uploading: boolean;
  }>({ total: 0, completed: 0, failed: 0, uploading: false });
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const [selectedPhotosForCarousel, setSelectedPhotosForCarousel] = useState<Set<string>>(new Set());
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState<boolean>(false);
  const [notionSavedPlatforms, setNotionSavedPlatforms] = useState<Set<string>>(new Set());

  const saveToNotionMutation = trpc.notion.syncPost.useMutation({
    onSuccess: (_, variables) => {
      setNotionSavedPlatforms(prev => new Set([...prev, variables.platform]));
      toast.success("Notionに保存しました ✓");
    },
    onError: (err) => {
      // 未設定・BAD_REQUEST・PRECONDITION_FAILED など全て「未設定」として扱う
      const isNotConfigured =
        err.message.includes("設定されていません") ||
        err.message.includes("連携が設定") ||
        (err as any)?.data?.code === "BAD_REQUEST" ||
        (err as any)?.data?.code === "PRECONDITION_FAILED";
      if (isNotConfigured) {
        toast.error(
          "❗ Notion連携が未設定です。左メニューの「Notion連携」からインテグレーショントークンとデータベースIDを設定してください。",
          { duration: 6000 }
        );
      } else {
        toast.error("❗ Notion保存に失敗しました。しばらく経ってから再試行してください。");
      }
    },
  });
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);

  // URLパラメータから下書きIDを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get('draftId');
    if (draftId) {
      setCurrentDraftId(Number(draftId));
    }
  }, []);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const utils = trpc.useUtils();
  const { data: customTemplates } = trpc.customTemplates.list.useQuery();
  
  // 作業履歴記録
  const logActivityMutation = trpc.activityLog.create.useMutation();

  // 下書き保存
  const saveDraftMutation = trpc.postDrafts.create.useMutation({
    onSuccess: (data) => {
      toast.success("下書きを保存しました");
      setShowSaveDraftDialog(false);
      setDraftTitle("");
      setCurrentDraftId(data.id);
    },
    onError: (error) => {
      toast.error(`下書き保存に失敗しました: ${error.message}`);
    },
  });

  // 下書き更新
  const updateDraftMutation = trpc.postDrafts.update.useMutation({
    onSuccess: () => {
      toast.success("下書きを更新しました");
      setShowSaveDraftDialog(false);
      setDraftTitle("");
    },
    onError: (error) => {
      toast.error(`下書き更新に失敗しました: ${error.message}`);
    },
  });

  // 下書き読み込み
  const { data: loadedDraft } = trpc.postDrafts.get.useQuery(
    { id: currentDraftId! },
    { enabled: !!currentDraftId }
  );

  // 下書きデータが読み込まれたら状態を更新
  useEffect(() => {
    if (loadedDraft) {
      // 会社名を設定
      setCompanyName(loadedDraft.companyName);
      setDraftTitle(loadedDraft.title || "");
      
      // ビフォーアフターモードの場合
      if (loadedDraft.isBeforeAfter) {
        setIsBeforeAfterMode(true);
        if (loadedDraft.beforeImageUrl) {
          setBeforeImage({ url: loadedDraft.beforeImageUrl });
        }
        if (loadedDraft.afterImageUrl) {
          setAfterImage({ url: loadedDraft.afterImageUrl });
        }
      } else {
        setIsBeforeAfterMode(false);
        if (loadedDraft.imageUrl) {
          setSelectedImage({ url: loadedDraft.imageUrl });
        }
      }
      
      // 投稿内容を設定
      setAllPlatformsPosts({
        instagram: {
          content: loadedDraft.instagramContent || "",
          hashtags: loadedDraft.instagramHashtags || "",
          platform: "instagram" as const,
        },
        x: {
          content: loadedDraft.xContent || "",
          hashtags: loadedDraft.xHashtags || "",
          platform: "x" as const,
        },
        threads: {
          content: loadedDraft.threadsContent || "",
          hashtags: loadedDraft.threadsHashtags || "",
          platform: "threads" as const,
        },
      });
      
      toast.success("下書きを読み込みました");
    }
  }, [loadedDraft]);



  const uploadImageMutation = trpc.demo.uploadAndAnalyzeImage.useMutation();

  const fetchPhotoMutation = trpc.demo.getRandomPhotoWithAnalysis.useMutation({
    onSuccess: (data) => {
      setSelectedImage(data);
      setAnalysis(data.analysis);
      setContents(null);
      setIndividualComments(null);
      setCarouselPost(null);
      setMultiplePhotos([]);
      toast.success("写真を取得し、AI分析が完了しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const fetchMultiplePhotosMutation = trpc.demo.getMultiplePhotosWithAnalysis.useMutation({
    onSuccess: (data) => {
      setMultiplePhotos(data.photos);
      // 最もスコアが高い写真を自動選択
      if (data.photos.length > 0) {
        setSelectedImage(data.photos[0]);
        setAnalysis(data.photos[0].analysis);
        setContents(null);
        setIndividualComments(null);
        setCarouselPost(null);
      }
      
      // 成功メッセージ
      toast.success(`${data.photos.length}枚の写真を取得し、AI分析が完了しました`);
      
      // エラーがあれば詳細を表示
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((error) => {
          toast.error(
            `写真${error.photoIndex}の取得失敗: ${error.reason}\n${error.details}`,
            { duration: 5000 }
          );
        });
      }
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const generateAllContentsMutation = trpc.demo.generateAllPlatformContents.useMutation({
    onSuccess: (data) => {
      setContents(data);
      setViewMode("single");
      toast.success("全プラットフォームの投稿文を生成しました");
      
      // 作業履歴を記録
      logActivityMutation.mutate({
        activityType: "post_generation",
        description: "上級者向けデモで投稿文を生成しました",
        status: "success",
        metadata: JSON.stringify({ 
          platforms: ["instagram", "x", "threads"],
          companyName,
          imageId: selectedImage?.id 
        }),
      });
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
      
      // エラーも記録
      logActivityMutation.mutate({
        activityType: "post_generation",
        description: "投稿文の生成に失敗しました",
        status: "failed",
        metadata: JSON.stringify({ error: error.message }),
      });
    },
  });

  const generateIndividualCommentsMutation = trpc.demo.generateIndividualComments.useMutation({
    onSuccess: (data) => {
      setIndividualComments(data);
      setViewMode("individual");
      toast.success("写真ごとの個別コメントを生成しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const generateCarouselPostMutation = trpc.demo.generateCarouselPost.useMutation({
    onSuccess: (data) => {
      setCarouselPost(data);
      setViewMode("carousel");
      toast.success("カルーセル投稿を生成しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const savePostMutation = trpc.demo.saveGeneratedPost.useMutation({
    onSuccess: () => {
      toast.success("投稿を保存しました");
      utils.demo.getSavedPosts.invalidate();
    },
    onError: (error) => {
      toast.error(`保存エラー: ${error.message}`);
    },
  });

  const generatePostFromTemplateMutation = trpc.demo.generatePostFromTemplate.useMutation();

  const generateBeforeAfterPostMutation = trpc.demo.generateBeforeAfterPost.useMutation({
    onSuccess: (data) => {
      setBeforeAfterPost(data);
      setAllPlatformsPosts(null); // 単一プラットフォーム生成時は一括生成結果をクリア
      toast.success("ビフォーアフター投稿文を生成しました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const generateAllPlatformsPostMutation = trpc.demo.generateBeforeAfterPostForAllPlatforms.useMutation({
    onSuccess: (data) => {
      setAllPlatformsPosts(data);
      setBeforeAfterPost(null); // 一括生成時は単一プラットフォーム結果をクリア
      toast.success("全プラットフォーム向けの投稿文を生成しました");
      logActivityMutation.mutate({ activityType: "post_generation", description: `全プラットフォーム向け投稿生成: ${companyName}`, status: "success" });
    },
  });

  // 複数画像から一括で投稿を生成して下書き保存
  const generateBulkPostsMutation = trpc.postDrafts.generateBulkFromImages.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.createdCount}件の投稿を下書き保存しました`);
      setMultiplePhotos([]);
      setSelectedImage(null);
      setAnalysis(null);
      logActivityMutation.mutate({ activityType: "post_generation", description: `一括投稿生成: ${companyName}, ${data.createdCount}件`, status: "success" });
    },
    onError: (error) => {
      toast.error(`一括生成に失敗しました: ${error.message}`);
    },
  });

  const createScheduleMutation = trpc.posts.createSchedule.useMutation({
    onSuccess: (data) => {
      toast.success("予約投稿を保存しました");
      
      // 作業履歴を記録
      logActivityMutation.mutate({
        activityType: "post_schedule",
        description: "上級者向けデモで予約投稿を作成しました",
        status: "success",
        metadata: JSON.stringify({ 
          scheduleId: data.id,
          scheduledAt: `${scheduleDate}T${scheduleTime}`,
          companyName,
          isBeforeAfter: isBeforeAfterMode
        }),
      });
      setShowScheduleDialog(false);
      setScheduleDate("");
      setScheduleTime("");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error("画像ファイルをドロップしてください");
      return;
    }


    toast.info(`${files.length}枚の写真をアップロード中...`);

    // 進捗状態を初期化
    setUploadProgress({ total: files.length, completed: 0, failed: 0, uploading: true });

    const uploadedPhotos: any[] = [];
    let processedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}は10MBを超えています`);
        errorCount++;
        if (processedCount + errorCount === totalFiles) {
          handleUploadComplete(uploadedPhotos);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        uploadImageMutation.mutate({
          imageBase64: base64String,
          fileName: file.name,
          companyName,
        }, {
          onSuccess: (data) => {
            // データ構造を変換: { photo: {url, id}, analysis } → { url, id, analysis, thumbnailUrl, fileName, albumTitle, albumYear, score }
            uploadedPhotos.push({
              url: data.photo.url,
              id: data.photo.id,
              thumbnailUrl: data.photo.url,
              fileName: file.name,
              albumTitle: "アップロード",
              albumYear: new Date().getFullYear(),
              analysis: data.analysis,
              score: 0,
            });
            processedCount++;
            setUploadProgress(prev => ({ ...prev, completed: processedCount }));
            
            if (processedCount + errorCount === totalFiles) {
              handleUploadComplete(uploadedPhotos);
            }
          },
          onError: (error) => {
            console.error(`Failed to upload ${file.name}:`, error);
            toast.error(`${file.name}のアップロードに失敗しました`);
            errorCount++;
            setUploadProgress(prev => ({ ...prev, failed: errorCount }));
            
            if (processedCount + errorCount === totalFiles) {
              handleUploadComplete(uploadedPhotos);
            }
          },
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;



    // 進捗状態を初期化
    setUploadProgress({ total: files.length, completed: 0, failed: 0, uploading: true });

    const uploadedPhotos: any[] = [];
    let processedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    Array.from(files).forEach((file) => {
      // ファイルサイズチェック (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}は10MBを超えています`);
        errorCount++;
        if (processedCount + errorCount === totalFiles) {
          handleUploadComplete(uploadedPhotos);
        }
        return;
      }

      // 画像ファイルかチェック
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}は画像ファイルではありません`);
        errorCount++;
        if (processedCount + errorCount === totalFiles) {
          handleUploadComplete(uploadedPhotos);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        uploadImageMutation.mutate({
          imageBase64: base64String,
          fileName: file.name,
          companyName,
        }, {
          onSuccess: (data) => {
            // データ構造を変換: { photo: {url, id}, analysis } → { url, id, analysis, thumbnailUrl, fileName, albumTitle, albumYear, score }
            uploadedPhotos.push({
              url: data.photo.url,
              id: data.photo.id,
              thumbnailUrl: data.photo.url,
              fileName: file.name,
              albumTitle: "アップロード",
              albumYear: new Date().getFullYear(),
              analysis: data.analysis,
              score: 0,
            });
            processedCount++;
            setUploadProgress(prev => ({ ...prev, completed: processedCount }));
            
            if (processedCount + errorCount === totalFiles) {
              handleUploadComplete(uploadedPhotos);
            }
          },
          onError: (error) => {
            console.error(`Failed to upload ${file.name}:`, error);
            toast.error(`${file.name}のアップロードに失敗しました`);
            errorCount++;
            setUploadProgress(prev => ({ ...prev, failed: errorCount }));
            
            if (processedCount + errorCount === totalFiles) {
              handleUploadComplete(uploadedPhotos);
            }
          },
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUploadComplete = (uploadedPhotos: any[]) => {
    setUploadProgress(prev => ({ ...prev, uploading: false }));
    
    if (uploadedPhotos && uploadedPhotos.length > 0) {
      setMultiplePhotos(uploadedPhotos);
      // uploadedPhotosの各要素は { url, id, analysis } という構造
      const firstPhoto = uploadedPhotos[0];
      if (firstPhoto) {
        setSelectedImage(firstPhoto);
        if (firstPhoto.analysis) {
          setAnalysis(firstPhoto.analysis);
        }
      }
      toast.success(`${uploadedPhotos.length}枚の写真をアップロードしました`);
    } else {
      toast.error("写真のアップロードに失敗しました");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMultiplePhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("写真の順序を変更しました");
    }
  };

  const handleGenerateAllContents = async () => {
    if (!analysis) {
      toast.error("まず写真を取得してください");
      return;
    }

    if (useTemplate && selectedTemplate) {
      // テンプレートを使用して生成
      try {
        const platforms = ["instagram", "x", "threads"] as const;
        const templateContents: any = {};

        // カスタムテンプレートかデフォルトテンプレートかを判定
        const isCustomTemplate = selectedTemplate.startsWith("custom-");
        
        if (isCustomTemplate) {
          // カスタムテンプレートを使用
          const templateId = parseInt(selectedTemplate.replace("custom-", ""));
          const generateCustomPostMutation = trpc.customTemplates.generatePost.useMutation();
          
          for (const platform of platforms) {
            const result = await generateCustomPostMutation.mutateAsync({
              templateId,
              platform,
              imageAnalysis: analysis,
            });

            templateContents[platform] = {
              caption: result.content,
              hashtags: result.hashtags.split(", "),
            };
          }
        } else {
          // デフォルトテンプレートを使用
          for (const platform of platforms) {
            const result = await generatePostFromTemplateMutation.mutateAsync({
              templateId: selectedTemplate,
              platform,
              imageAnalysis: analysis,
            });

            templateContents[platform] = {
              caption: result.content,
              hashtags: result.hashtags.split(", "),
            };
          }
        }

        setContents(templateContents);
        setViewMode("single");
        toast.success("テンプレートで投稿文を生成しました");
      } catch (error: any) {
        toast.error(`エラー: ${error.message}`);
      }
    } else {
      // 通常の生成
      generateAllContentsMutation.mutate({
        companyName,
        imageAnalysis: analysis,
      });
    }
  };

  const handleGenerateIndividualComments = () => {
    if (multiplePhotos.length === 0) {
      toast.error("複数の写真をアップロードしてください");
      return;
    }

    const imageAnalyses = multiplePhotos.map(photo => photo.analysis);
    
    generateIndividualCommentsMutation.mutate({
      companyName,
      platform: "instagram",
      imageAnalyses,
    });
  };

  const handleGenerateCarouselPost = () => {
    if (multiplePhotos.length < 2) {
      toast.error("カルーセル投稿には2枚以上の写真が必要です");
      return;
    }

    const imageAnalyses = multiplePhotos.map(photo => photo.analysis);
    
    generateCarouselPostMutation.mutate({
      companyName,
      platform: "instagram",
      imageAnalyses,
    });
  };

  const copyToClipboard = async (text: string, platform: string, imageUrl?: string) => {
    try {
      if (imageUrl && navigator.clipboard.write) {
        // 画像と投稿文を一緒にコピー
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob,
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
        toast.success(`${platform}の投稿文と写真をコピーしました`);
      } else {
        // 投稿文のみコピー
        await navigator.clipboard.writeText(text);
        toast.success(`${platform}の投稿文をコピーしました`);
      }
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (error) {
      // フォールバック: 投稿文のみコピー
      await navigator.clipboard.writeText(text);
      toast.success(`${platform}の投稿文をコピーしました`);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    }
  };

  const handleSavePost = () => {
    if (!selectedImage || !contents) {
      toast.error("投稿を生成してから保存してください");
      return;
    }

    const scheduledAt = scheduledDate ? new Date(scheduledDate) : undefined;

    savePostMutation.mutate({
      companyName,
      imageUrl: selectedImage.url,
      imageAnalysis: analysis,
      contents,
      scheduledAt,
    });
  };

  const renderPostContent = (platform: string, content: any, icon: any) => {
    const fullText = `${content.caption}\n\n${content.hashtags.map((tag: string) => `#${tag}`).join(" ")}`;
    const Icon = icon;

    return (
      <Card key={platform}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {platform === "instagram" ? "Instagram" : platform === "x" ? "X (Twitter)" : "Threads"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">投稿文</Label>
            <p className="mt-2 text-sm whitespace-pre-wrap">{content.caption}</p>
          </div>
          <div>
            <Label className="text-sm font-semibold">ハッシュタグ</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {content.hashtags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedImage?.url && (
              <Button
                variant="outline"
                size="sm"
                title="画像をダウンロード"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const response = await fetch(selectedImage.url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    const ext = selectedImage.url.split('.').pop()?.split('?')[0] || 'jpg';
                    link.download = `hazemoto-${platform}-${Date.now()}.${ext}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  } catch {
                    toast.error('画像のダウンロードに失敗しました。画像を長押し（または右クリック）して保存してください。');
                  }
                }}
                className="shrink-0"
              >
                <Download className="mr-2 h-4 w-4" />
                画像を保存
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(fullText, platform, selectedImage?.photo?.url)}
              className="flex-1"
            >
              {copiedPlatform === platform ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  写真と投稿文を一括コピー
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveToNotionMutation.mutate({
                title: `${companyName} ${platform} 投稿`,
                platform,
                companyName,
                postText: content.caption,
                hashtags: content.hashtags.map((t: string) => `#${t}`).join(" "),
                status: "draft",
              })}
              disabled={saveToNotionMutation.isPending || notionSavedPlatforms.has(platform)}
              className="shrink-0"
            >
              {notionSavedPlatforms.has(platform) ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Notion保存済み
                </>
              ) : saveToNotionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Notionに保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI投稿文生成デモ</h1>
          <p className="text-muted-foreground mt-2">
            写真をアップロードまたはGoogle フォトから取得し、AIが自動で投稿文を生成します
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>会社選択</CardTitle>
            <CardDescription>投稿する会社を選択してください</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={companyName} onValueChange={(value: any) => setCompanyName(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ハゼモト建設">ハゼモト建設（住宅購入検討者向け）</SelectItem>
                <SelectItem value="クリニックアーキプロ">クリニックアーキプロ（医療関係者向け）</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* テンプレート選択 */}
        <Card>
          <CardHeader>
            <CardTitle>テンプレート選択</CardTitle>
            <CardDescription>保存したテンプレートを適用できます</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateSelector companyName={companyName} onApplyTemplate={handleApplyTemplate} />
          </CardContent>
        </Card>

        {/* ビフォーアフターモード切り替え */}
        <Card>
          <CardHeader>
            <CardTitle>投稿モード</CardTitle>
            <CardDescription>通常投稿またはビフォーアフター投稿を選択</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsBeforeAfterMode(false);
                  setBeforeImage(null);
                  setAfterImage(null);
                  setBeforeAfterPost(null);
                }}
                variant={!isBeforeAfterMode ? "default" : "outline"}
                className="flex-1"
              >
                通常投稿
              </Button>
              <Button
                onClick={() => {
                  setIsBeforeAfterMode(true);
                  setSelectedImage(null);
                  setAnalysis(null);
                  setContents(null);
                  setMultiplePhotos([]);
                }}
                variant={isBeforeAfterMode ? "default" : "outline"}
                className="flex-1"
              >
                🔄 ビフォーアフター
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ビフォーアフターモードのUI */}
        {isBeforeAfterMode ? (
          <Card>
            <CardHeader>
              <CardTitle>🔄 ビフォーアフター投稿文生成</CardTitle>
              <CardDescription>施工前と施工後の2枚の写真をアップロードして、変化を強調する投稿文を生成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 施工前の写真 */}
                <div>
                  <Label htmlFor="before-image">施工前の写真</Label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      id="before-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          uploadImageMutation.mutate({
                            imageBase64: reader.result as string,
                            fileName: file.name,
                            companyName,
                          }, {
                            onSuccess: (data) => {
                              setBeforeImage(data.photo);
                              toast.success("施工前の写真をアップロードしました");
                            },
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                    <label htmlFor="before-image" className="cursor-pointer">
                      {beforeImage ? (
                        <img src={beforeImage.url} alt="施工前" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-8">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">クリックして選択</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* 施工後の写真 */}
                <div>
                  <Label htmlFor="after-image">施工後の写真</Label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      id="after-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          uploadImageMutation.mutate({
                            imageBase64: reader.result as string,
                            fileName: file.name,
                            companyName,
                          }, {
                            onSuccess: (data) => {
                              setAfterImage(data.photo);
                              toast.success("施工後の写真をアップロードしました");
                            },
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                    <label htmlFor="after-image" className="cursor-pointer">
                      {afterImage ? (
                        <img src={afterImage.url} alt="施工後" className="w-full h-48 object-cover rounded" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-8">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">クリックして選択</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* プラットフォーム選択 */}
              <div>
                <Label htmlFor="before-after-platform">投稿先プラットフォーム</Label>
                <Select value={beforeAfterPlatform} onValueChange={(value: any) => setBeforeAfterPlatform(value)}>
                  <SelectTrigger id="before-after-platform" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram (2200文字)
                      </div>
                    </SelectItem>
                    <SelectItem value="x">
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        X (280文字)
                      </div>
                    </SelectItem>
                    <SelectItem value="threads">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Threads (500文字)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 生成ボタン */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    if (!beforeImage || !afterImage) {
                      toast.error("施工前と施工後の写真を両方アップロードしてください");
                      return;
                    }
                    if (!beforeImage.url || !afterImage.url) {
                      toast.error("写真URLが無効です。もう一度アップロードしてください");
                      return;
                    }
                    generateBeforeAfterPostMutation.mutate({
                      beforeImageUrl: beforeImage.url,
                      afterImageUrl: afterImage.url,
                      companyName,
                      platform: beforeAfterPlatform,
                    });
                  }}
                  disabled={!beforeImage || !afterImage || generateBeforeAfterPostMutation.isPending || generateAllPlatformsPostMutation.isPending}
                  variant="outline"
                >
                  {generateBeforeAfterPostMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      {beforeAfterPlatform === "instagram" && <Instagram className="mr-2 h-4 w-4" />}
                      {beforeAfterPlatform === "x" && <Twitter className="mr-2 h-4 w-4" />}
                      {beforeAfterPlatform === "threads" && <MessageSquare className="mr-2 h-4 w-4" />}
                      {beforeAfterPlatform === "instagram" ? "Instagram" : beforeAfterPlatform === "x" ? "X" : "Threads"}のみ
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    if (!beforeImage || !afterImage) {
                      toast.error("施工前と施工後の写真を両方アップロードしてください");
                      return;
                    }
                    if (!beforeImage.url || !afterImage.url) {
                      toast.error("写真URLが無効です。もう一度アップロードしてください");
                      return;
                    }
                    generateAllPlatformsPostMutation.mutate({
                      beforeImageUrl: beforeImage.url,
                      afterImageUrl: afterImage.url,
                      companyName,
                    });
                  }}
                  disabled={!beforeImage || !afterImage || generateBeforeAfterPostMutation.isPending || generateAllPlatformsPostMutation.isPending}
                >
                  {generateAllPlatformsPostMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "🚀 すべてのプラットフォーム向けに一括生成"
                  )}
                </Button>
              </div>

              {/* 生成結果表示 */}
              {beforeAfterPost && (() => {
                const fullPost = `${beforeAfterPost.content}\n\n${beforeAfterPost.hashtags}`;
                const charCount = fullPost.length;
                const maxChars = beforeAfterPlatform === "instagram" ? 2200 : beforeAfterPlatform === "x" ? 280 : 500;
                const isOverLimit = charCount > maxChars;
                
                return (
                  <div className="mt-4 space-y-4">
                    {/* プラットフォーム情報 */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {beforeAfterPlatform === "instagram" && <Instagram className="h-5 w-5" />}
                        {beforeAfterPlatform === "x" && <Twitter className="h-5 w-5" />}
                        {beforeAfterPlatform === "threads" && <MessageSquare className="h-5 w-5" />}
                        <span className="font-semibold">
                          {beforeAfterPlatform === "instagram" ? "Instagram" : beforeAfterPlatform === "x" ? "X" : "Threads"}向け投稿文
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${
                        isOverLimit ? "text-destructive" : charCount > maxChars * 0.9 ? "text-orange-500" : "text-muted-foreground"
                      }`}>
                        {charCount} / {maxChars}文字
                        {isOverLimit && " (制限超過)"}
                      </div>
                    </div>

                    {/* 投稿文 */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">生成された投稿文</h3>
                      <p className="whitespace-pre-wrap text-sm">{beforeAfterPost.content}</p>
                    </div>

                    {/* ハッシュタグ */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">ハッシュタグ</h3>
                      <p className="text-sm text-muted-foreground">{beforeAfterPost.hashtags}</p>
                    </div>

                    {/* 文字数超過警告 */}
                    {isOverLimit && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-sm text-destructive font-medium">
                          ⚠️ 文字数が{beforeAfterPlatform === "instagram" ? "Instagram" : beforeAfterPlatform === "x" ? "X" : "Threads"}の制限({maxChars}文字)を超えています。
                          投稿前に編集してください。
                        </p>
                      </div>
                    )}

                    {/* コピーボタン */}
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(fullPost);
                        toast.success("投稿文をコピーしました");
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      投稿文をコピー
                    </Button>
                  </div>
                );
              })()}

              {/* 一括生成結果表示 */}
              {allPlatformsPosts && (
                <div className="mt-4 space-y-4">
                  {/* タブ */}
                  <div className="flex gap-2 border-b">
                    <button
                      onClick={() => setActiveTab("instagram")}
                      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                        activeTab === "instagram"
                          ? "border-primary text-primary font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </button>
                    <button
                      onClick={() => setActiveTab("x")}
                      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                        activeTab === "x"
                          ? "border-primary text-primary font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Twitter className="h-4 w-4" />
                      X
                    </button>
                    <button
                      onClick={() => setActiveTab("threads")}
                      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                        activeTab === "threads"
                          ? "border-primary text-primary font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Threads
                    </button>
                  </div>

                  {/* タブコンテンツ */}
                  {(() => {
                    const currentPost = allPlatformsPosts[activeTab];
                    if (!currentPost) return null;

                    const fullPost = `${currentPost.content}\n\n${currentPost.hashtags}`;
                    const charCount = fullPost.length;
                    const maxChars = activeTab === "instagram" ? 2200 : activeTab === "x" ? 280 : 500;
                    const isOverLimit = charCount > maxChars;

                    return (
                      <div className="space-y-4">
                        {/* プラットフォーム情報 */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            {activeTab === "instagram" && <Instagram className="h-5 w-5" />}
                            {activeTab === "x" && <Twitter className="h-5 w-5" />}
                            {activeTab === "threads" && <MessageSquare className="h-5 w-5" />}
                            <span className="font-semibold">
                              {activeTab === "instagram" ? "Instagram" : activeTab === "x" ? "X" : "Threads"}向け投稿文
                            </span>
                          </div>
                          <div className={`text-sm font-medium ${
                            isOverLimit ? "text-destructive" : charCount > maxChars * 0.9 ? "text-orange-500" : "text-muted-foreground"
                          }`}>
                            {charCount} / {maxChars}文字
                            {isOverLimit && " (制限超過)"}
                          </div>
                        </div>

                        {/* 投稿文 */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">生成された投稿文</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPosts = { ...allPlatformsPosts };
                                newPosts[activeTab] = { ...currentPost };
                                setAllPlatformsPosts(newPosts);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                          <textarea
                            value={currentPost.content}
                            onChange={(e) => {
                              const newPosts = { ...allPlatformsPosts };
                              newPosts[activeTab] = { ...currentPost, content: e.target.value };
                              setAllPlatformsPosts(newPosts);
                            }}
                            className="w-full min-h-[200px] p-2 border rounded text-sm resize-y"
                          />
                        </div>

                        {/* ハッシュタグ */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">ハッシュタグ</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPosts = { ...allPlatformsPosts };
                                newPosts[activeTab] = { ...currentPost };
                                setAllPlatformsPosts(newPosts);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                          <textarea
                            value={currentPost.hashtags}
                            onChange={(e) => {
                              const newPosts = { ...allPlatformsPosts };
                              newPosts[activeTab] = { ...currentPost, hashtags: e.target.value };
                              setAllPlatformsPosts(newPosts);
                            }}
                            className="w-full min-h-[80px] p-2 border rounded text-sm resize-y"
                          />
                        </div>

                        {/* 文字数超過警告 */}
                        {isOverLimit && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ 文字数が{activeTab === "instagram" ? "Instagram" : activeTab === "x" ? "X" : "Threads"}の制限({maxChars}文字)を超えています。
                              投稿前に編集してください。
                            </p>
                          </div>
                        )}

                        {/* アクションボタン */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(fullPost);
                              toast.success("投稿文をコピーしました");
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            コピー
                          </Button>
                          <Button
                            onClick={() => setShowSaveDraftDialog(true)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            下書き保存
                          </Button>
                          <Button
                            onClick={() => setShowScheduleDialog(true)}
                            variant="default"
                            className="flex-1"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            予約投稿
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>写真の取得</CardTitle>
              <CardDescription>写真をアップロードするか、Google フォトから取得してください</CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* ドラッグ&ドロップエリア */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/50 hover:border-primary'
              }`}
            >
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploadImageMutation.isPending}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">写真を選択</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    クリックしてファイルを選択、またはドラッグ&ドロップ
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💻 ローカルファイル ・ 🗄️ NAS ・ ☁️ クラウドストレージ
                  </p>
                </div>
              </label>
            </div>

            {/* アップロード進捗表示 */}
            {uploadProgress.uploading && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">アップロード中...</span>
                  <span className="text-sm text-muted-foreground">
                    {uploadProgress.completed} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{
                      width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`,
                    }}
                  />
                </div>
                {uploadProgress.failed > 0 && (
                  <p className="text-xs text-destructive mt-2">
                    {uploadProgress.failed}件のアップロードに失敗しました
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => fetchPhotoMutation.mutate()}
                disabled={fetchPhotoMutation.isPending || uploadProgress.uploading}
                variant="outline"
                className="flex-1"
              >
                {fetchPhotoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    取得中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Google フォトから1枚取得
                  </>
                )}
              </Button>
              <Button
                onClick={() => fetchMultiplePhotosMutation.mutate({ count: photoCount })}
                disabled={fetchMultiplePhotosMutation.isPending || uploadProgress.uploading}
                variant="outline"
                className="flex-1"
              >
                {fetchMultiplePhotosMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    取得中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {photoCount}枚取得 & AI分析
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}



        {!isBeforeAfterMode && multiplePhotos.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>取得した写真（{multiplePhotos.length}枚）</CardTitle>
                  <CardDescription>AIがスコア付けした結果です</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      generateBulkPostsMutation.mutate({
                        companyName,
                        images: multiplePhotos.map(photo => ({
                          url: photo.url,
                          analysis: photo.analysis,
                          fileName: photo.fileName,
                        })),
                      });
                    }}
                    disabled={generateBulkPostsMutation.isPending}
                  >
                    {generateBulkPostsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        全て下書き保存
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setMultiplePhotos([]);
                      setSelectedImage(null);
                      setAnalysis(null);
                      toast.success("全ての写真を削除しました");
                    }}
                  >
                    一括削除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={multiplePhotos.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {multiplePhotos.map((photo, index) => (
                      <SortablePhotoItem
                        key={photo.id}
                        photo={photo}
                        index={index}
                        selectedImage={selectedImage}
                        onSelect={() => {
                          setSelectedImage(photo);
                          setAnalysis(photo.analysis);
                        }}
                        onEnlarge={() => setEnlargedImage(photo.url)}
                        onDelete={() => {
                          const newPhotos = multiplePhotos.filter((_, i) => i !== index);
                          setMultiplePhotos(newPhotos);
                          if (selectedImage?.id === photo.id && newPhotos.length > 0) {
                            setSelectedImage(newPhotos[0]);
                            setAnalysis(newPhotos[0].analysis);
                          } else if (newPhotos.length === 0) {
                            setSelectedImage(null);
                            setAnalysis(null);
                          }
                          toast.success("写真を削除しました");
                        }}
                        isSelected={selectedPhotosForCarousel.has(photo.id)}
                        onToggleSelect={() => {
                          const newSelected = new Set(selectedPhotosForCarousel);
                          if (newSelected.has(photo.id)) {
                            newSelected.delete(photo.id);
                          } else {
                            newSelected.add(photo.id);
                          }
                          setSelectedPhotosForCarousel(newSelected);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        )}

        {/* 選択した写真でカルーセル投稿を生成 */}
        {!isBeforeAfterMode && selectedPhotosForCarousel.size >= 2 && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-semibold">{selectedPhotosForCarousel.size}枚の写真を選択中</p>
                  <p className="text-sm text-muted-foreground">カルーセル投稿を生成できます</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const selectedPhotosArray = multiplePhotos.filter(p => selectedPhotosForCarousel.has(p.id));
                      const imageAnalyses = selectedPhotosArray.map(photo => photo.analysis);
                      generateCarouselPostMutation.mutate({
                        companyName,
                        platform: "instagram",
                        imageAnalyses,
                      });
                    }}
                    disabled={generateCarouselPostMutation.isPending}
                    size="lg"
                  >
                    {generateCarouselPostMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        選択した写真でカルーセル投稿を生成
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPhotosForCarousel(new Set())}
                  >
                    選択をクリア
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedImage && (
          <Card>
            <CardHeader>
              <CardTitle>選択された写真</CardTitle>
              <CardDescription>AI分析結果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt="Selected"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateAllContents}
                  disabled={generateAllContentsMutation.isPending || !analysis || (useTemplate && !selectedTemplate)}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {generateAllContentsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      この画像を確定して投稿文を生成
                    </>
                  )}
                </Button>
              </div>
              {analysis && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-semibold">カテゴリー</Label>
                    <p className="text-sm">{analysis.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">スタイル</Label>
                    <p className="text-sm">{analysis.style}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">説明</Label>
                    <p className="text-sm">{analysis.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">キーワード</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.keywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* テンプレート選択 */}
              <div className="space-y-4 pb-4 border-b">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="use-template"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use-template">投稿テンプレートを使用</Label>
                </div>
                {useTemplate && (
                  <div className="space-y-2">
                    <Select value={selectedTemplate || ""} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="テンプレートを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="font-semibold px-2 py-1.5 text-sm text-muted-foreground">デフォルトテンプレート</div>
                        <SelectItem value="new_construction">新築完成</SelectItem>
                        <SelectItem value="renovation">リフォーム事例</SelectItem>
                        <SelectItem value="open_house">見学会告知</SelectItem>
                        {customTemplates && customTemplates.length > 0 && (
                          <>
                            <div className="font-semibold px-2 py-1.5 text-sm text-muted-foreground border-t mt-2 pt-2">カスタムテンプレート</div>
                            {customTemplates.map((template) => (
                              <SelectItem key={`custom-${template.id}`} value={`custom-${template.id}`}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      テンプレートを編集するには<a href="/templates" className="underline">テンプレート管理ページ</a>へ
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateAllContents}
                  disabled={generateAllContentsMutation.isPending || (useTemplate && !selectedTemplate)}
                  className="flex-1"
                >
                  {generateAllContentsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : useTemplate ? (
                    "テンプレートで投稿文を生成"
                  ) : (
                    "全SNSの投稿文を生成"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  title="画像をダウンロード"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const response = await fetch(selectedImage.url);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      const ext = selectedImage.url.split('.').pop()?.split('?')[0] || 'jpg';
                      link.download = `hazemoto-${Date.now()}.${ext}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                    } catch {
                      toast.error('画像のダウンロードに失敗しました。画像を長押し（または右クリック）して保存してください。');
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              {multiplePhotos.length >= 2 && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleGenerateIndividualComments}
                    disabled={generateIndividualCommentsMutation.isPending}
                    variant="secondary"
                    className="flex-1"
                  >
                    {generateIndividualCommentsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "写真ごとの個別コメント生成"
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateCarouselPost}
                    disabled={generateCarouselPostMutation.isPending}
                    variant="secondary"
                    className="flex-1"
                  >
                    {generateCarouselPostMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "カルーセル投稿を生成"
                    )}
                  </Button>
                </div>
              )}
              {multiplePhotos.length >= 2 && individualComments && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => setShowBatchScheduleDialog(true)}
                    variant="default"
                    className="flex-1"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    一括スケジュール設定
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {viewMode === "single" && contents && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">生成された投稿文</h2>
              <Badge variant="outline">単一投稿モード</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {renderPostContent("instagram", contents.instagram, Instagram)}
              {renderPostContent("x", contents.x, Twitter)}
              {renderPostContent("threads", contents.threads, MessageSquare)}
            </div>
          </div>
        )}

        {viewMode === "individual" && individualComments && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">写真ごとの個別コメント</h2>
              <Badge variant="outline">個別コメントモード</Badge>
            </div>
            <div className="space-y-6">
              {individualComments.map((comment: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>写真 {index + 1} のコメント</CardTitle>
                    {multiplePhotos[index] && (
                      <img
                        src={multiplePhotos[index].url}
                        alt={`写真 ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg mt-2"
                      />
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">投稿文</Label>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{comment.caption}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">ハッシュタグ</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.hashtags.map((tag: string, tagIndex: number) => (
                          <Badge key={tagIndex} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const fullText = `${comment.caption}\n\n${comment.hashtags.map((tag: string) => `#${tag}`).join(" ")}`;
                        copyToClipboard(fullText, `photo-${index}`, multiplePhotos[index]?.photo?.url);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      写真と投稿文をコピー
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {viewMode === "carousel" && carouselPost && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">カルーセル投稿</h2>
              <Badge variant="outline">カルーセルモード</Badge>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  Instagram カルーセル投稿
                </CardTitle>
                <CardDescription>{multiplePhotos.length}枚の写真をまとめた投稿</CardDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
                  {multiplePhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`写真 ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">投稿文</Label>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{carouselPost.caption}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">ハッシュタグ</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {carouselPost.hashtags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fullText = `${carouselPost.caption}\n\n${carouselPost.hashtags.map((tag: string) => `#${tag}`).join(" ")}`;
                    copyToClipboard(fullText, "carousel");
                  }}
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  投稿文をコピー
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {contents && (
          <Card>
            <CardHeader>
              <CardTitle>投稿の保存</CardTitle>
              <CardDescription>投稿履歴に保存したり、スケジュール予約ができます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scheduled-date">投稿予定日時（オプション）</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button
                onClick={handleSavePost}
                disabled={savePostMutation.isPending}
                className="w-full"
              >
                {savePostMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    投稿を保存
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 下書き保存ダイアログ */}
      <Dialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>下書きを保存</DialogTitle>
            <DialogDescription>
              投稿内容を下書きとして保存します。後で編集を再開できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="draft-title">タイトル（任意）</Label>
              <Input
                id="draft-title"
                type="text"
                placeholder="例: 新築工事の投稿"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDraftDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                const draftData: any = {
                  companyName,
                  title: draftTitle || undefined,
                  isBeforeAfter: isBeforeAfterMode,
                };

                // 画像を追加
                if (isBeforeAfterMode) {
                  if (beforeImage?.url) draftData.beforeImageUrl = beforeImage.url;
                  if (afterImage?.url) draftData.afterImageUrl = afterImage.url;
                } else {
                  if (selectedImage?.url) draftData.imageUrl = selectedImage.url;
                }

                // 投稿内容を追加
                if (allPlatformsPosts) {
                  draftData.instagramContent = allPlatformsPosts.instagram?.content;
                  draftData.instagramHashtags = allPlatformsPosts.instagram?.hashtags;
                  draftData.xContent = allPlatformsPosts.x?.content;
                  draftData.xHashtags = allPlatformsPosts.x?.hashtags;
                  draftData.threadsContent = allPlatformsPosts.threads?.content;
                  draftData.threadsHashtags = allPlatformsPosts.threads?.hashtags;
                }

                // 新規保存または更新
                if (currentDraftId) {
                  updateDraftMutation.mutate({ id: currentDraftId, ...draftData });
                } else {
                  saveDraftMutation.mutate(draftData);
                }
              }}
              disabled={saveDraftMutation.isPending || updateDraftMutation.isPending}
            >
              {(saveDraftMutation.isPending || updateDraftMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {currentDraftId ? "更新" : "保存"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 予約投稿ダイアログ */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>予約投稿を作成</DialogTitle>
            <DialogDescription>
              生成した投稿文を予約投稿として保存します。指定した日時の30分前に通知が届きます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 日付選択 */}
            <div className="space-y-2">
              <Label htmlFor="schedule-date">投稿予定日</Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* 時刻選択 */}
            <div className="space-y-2">
              <Label htmlFor="schedule-time">投稿予定時刻</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>

            {/* プラットフォーム表示 */}
            <div className="space-y-2">
              <Label>投稿先プラットフォーム</Label>
              <div className="flex gap-2">
                {allPlatformsPosts ? (
                  <>
                    <Badge variant="secondary">
                      <Instagram className="mr-1 h-3 w-3" />
                      Instagram
                    </Badge>
                    <Badge variant="secondary">
                      <Twitter className="mr-1 h-3 w-3" />
                      X
                    </Badge>
                    <Badge variant="secondary">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      Threads
                    </Badge>
                  </>
                ) : beforeAfterPost ? (
                  <Badge variant="secondary">
                    {beforeAfterPlatform === "instagram" && <><Instagram className="mr-1 h-3 w-3" />Instagram</>}
                    {beforeAfterPlatform === "x" && <><Twitter className="mr-1 h-3 w-3" />X</>}
                    {beforeAfterPlatform === "threads" && <><MessageSquare className="mr-1 h-3 w-3" />Threads</>}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* 投稿タイプ表示 */}
            {isBeforeAfterMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <Calendar className="inline mr-1 h-4 w-4" />
                  ビフォーアフター投稿として保存されます
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!scheduleDate || !scheduleTime) {
                  toast.error("日付と時刻を選択してください");
                  return;
                }

                const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
                
                createScheduleMutation.mutate({
                  companyName,
                  scheduledAt,
                  isBeforeAfter: isBeforeAfterMode,
                  beforeImageUrl: beforeImage?.url,
                  afterImageUrl: afterImage?.url,
                });
              }}
              disabled={createScheduleMutation.isPending || !scheduleDate || !scheduleTime}
            >
              {createScheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  予約投稿を保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一括スケジュールダイアログ */}
      <Dialog open={showBatchScheduleDialog} onOpenChange={setShowBatchScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>一括スケジュール設定</DialogTitle>
            <DialogDescription>
              {multiplePhotos.length}枚の写真の投稿を一括でスケジュール設定します。指定した時間間隔で自動的に投稿されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 開始日時 */}
            <div className="space-y-2">
              <Label htmlFor="batch-schedule-date">開始日時</Label>
              <Input
                id="batch-schedule-date"
                type="datetime-local"
                value={batchScheduleDate}
                onChange={(e) => setBatchScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* 時間間隔 */}
            <div className="space-y-2">
              <Label htmlFor="batch-schedule-interval">投稿間隔（時間）</Label>
              <Input
                id="batch-schedule-interval"
                type="number"
                min="1"
                max="24"
                value={batchScheduleInterval}
                onChange={(e) => setBatchScheduleInterval(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                {multiplePhotos.length}枚の写真が{batchScheduleInterval}時間ごとに投稿されます
              </p>
            </div>

            {/* プレビュー */}
            <div className="space-y-2">
              <Label>投稿スケジュール</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {multiplePhotos.map((photo, index) => {
                  const scheduleTime = batchScheduleDate ? new Date(new Date(batchScheduleDate).getTime() + index * batchScheduleInterval * 60 * 60 * 1000) : null;
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">投稿 {index + 1}:</span>
                      <span className="text-muted-foreground">
                        {scheduleTime ? scheduleTime.toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchScheduleDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!batchScheduleDate) {
                  toast.error("開始日時を選択してください");
                  return;
                }

                // 各写真に対してスケジュールを作成
                multiplePhotos.forEach((photo, index) => {
                  const scheduledAt = new Date(new Date(batchScheduleDate).getTime() + index * batchScheduleInterval * 60 * 60 * 1000);
                  
                  createScheduleMutation.mutate({
                    companyName,
                    scheduledAt,
                    isBeforeAfter: false,
                    beforeImageUrl: photo.url,
                    afterImageUrl: undefined,
                  });
                });

                toast.success(`${multiplePhotos.length}件の予約投稿を作成しました`);
                setShowBatchScheduleDialog(false);
              }}
              disabled={!batchScheduleDate}
            >
              <Clock className="mr-2 h-4 w-4" />
              {multiplePhotos.length}件の予約投稿を作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 画像拡大表示ダイアログ */}
      <Dialog open={enlargedImage !== null} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>画像プレビュー</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <div className="flex items-center justify-center">
              <img
                src={enlargedImage}
                alt="拡大表示"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnlargedImage(null)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
