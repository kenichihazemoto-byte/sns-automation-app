import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface VoiceGuideProps {
  text: string;
  autoPlay?: boolean;
}

/**
 * 音声ガイドコンポーネント
 * Web Speech APIを使ってテキストを読み上げる
 */
export function VoiceGuide({ text, autoPlay = false }: VoiceGuideProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem("voiceGuideEnabled") !== "false";
  });
  const [rate, setRate] = useState(() => {
    const saved = localStorage.getItem("voiceGuideRate");
    return saved ? parseFloat(saved) : 1.0;
  });

  // 音声合成がサポートされているかチェック
  const isSpeechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (autoPlay && isEnabled && isSpeechSupported) {
      // 少し遅延させてから自動再生
      const timer = setTimeout(() => {
        speak();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [text, autoPlay, isEnabled]);

  useEffect(() => {
    localStorage.setItem("voiceGuideEnabled", isEnabled.toString());
  }, [isEnabled]);

  useEffect(() => {
    localStorage.setItem("voiceGuideRate", rate.toString());
  }, [rate]);

  const speak = () => {
    if (!isSpeechSupported) {
      toast.error("お使いのブラウザは音声ガイドに対応していません");
      return;
    }

    // 既に再生中の場合は停止
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsPlaying(false);
      toast.error("音声ガイドの再生に失敗しました");
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
    if (isPlaying) {
      stopSpeaking();
    }
    toast.success(isEnabled ? "音声ガイドをオフにしました" : "音声ガイドをオンにしました");
  };

  const changeRate = (newRate: number) => {
    setRate(newRate);
    toast.success(`再生速度を${newRate}倍に変更しました`);
  };

  if (!isSpeechSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={isPlaying ? stopSpeaking : speak}
        disabled={!isEnabled}
        className="gap-2"
      >
        {isPlaying ? (
          <>
            <VolumeX className="h-4 w-4" />
            停止
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4" />
            音声ガイド
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>音声ガイド設定</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleEnabled}>
            {isEnabled ? "オフにする" : "オンにする"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>再生速度</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => changeRate(0.75)}>
            0.75倍（ゆっくり）{rate === 0.75 && " ✓"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeRate(1.0)}>
            1.0倍（標準）{rate === 1.0 && " ✓"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeRate(1.25)}>
            1.25倍（少し速い）{rate === 1.25 && " ✓"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeRate(1.5)}>
            1.5倍（速い）{rate === 1.5 && " ✓"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
