import { useEffect, useState } from "react";

/**
 * GBP OAuth2コールバックページ
 * ポップアップウィンドウで開かれ、認証コードを親ウィンドウに postMessage で送信する
 */
export default function GBPOAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("認証処理中...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage(`認証エラー: ${error}`);
      // 親ウィンドウにエラーを通知
      if (window.opener) {
        window.opener.postMessage({ type: "GBP_OAUTH_ERROR", error }, window.location.origin);
      }
      setTimeout(() => window.close(), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("認証コードが取得できませんでした");
      if (window.opener) {
        window.opener.postMessage({ type: "GBP_OAUTH_ERROR", error: "no_code" }, window.location.origin);
      }
      setTimeout(() => window.close(), 3000);
      return;
    }

    // 認証コードを親ウィンドウに送信
    if (window.opener) {
      window.opener.postMessage(
        { type: "GBP_OAUTH_SUCCESS", code, state },
        window.location.origin
      );
      setStatus("success");
      setMessage("認証が完了しました。このウィンドウを閉じています...");
      setTimeout(() => window.close(), 1500);
    } else {
      setStatus("error");
      setMessage("親ウィンドウが見つかりません。このページを閉じて再度お試しください。");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-sm">
        {status === "processing" && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        )}
        {status === "success" && (
          <div className="text-green-500 text-5xl mb-4">✓</div>
        )}
        {status === "error" && (
          <div className="text-red-500 text-5xl mb-4">✗</div>
        )}
        <p className="text-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
