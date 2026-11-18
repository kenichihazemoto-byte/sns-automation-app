"""たいよう様 入口からのパース（テーブル4台版）を Gemini で写真調に仕上げる。
使い方: python3 scripts/gemini-taiyo-tables4.py [GN|GD|CN|CD ...]
  G=白い壁 C=チャコールの壁 / N=夜 D=昼
鍵: 環境変数 GEMINI_API_KEY → ~/.config/hazemoto/gemini_key → なければ "proxy"（クラウドのネットワーク秘密で差し込み）
"""
import base64, json, os, sys, time, urllib.request, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "docs/taiyo-perse/v2_tables4"
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-image")
def key():
    if os.environ.get("GEMINI_API_KEY"): return os.environ["GEMINI_API_KEY"]
    p = pathlib.Path.home() / ".config/hazemoto/gemini_key"
    return p.read_text().strip() if p.exists() else "proxy"
COMMON = """Photorealistic interior architectural visualization of a small Japanese dining bar, seen from the entrance door, eye level 1500mm.
STRICTLY follow the layout, camera angle and object positions of the first image (a 3D block-out). Convert each block to a real object; do NOT add or remove furniture.
Furniture (exact count):
- Exactly FOUR wooden dining tables in total (light oak tops, black steel legs): three tables in a row along the left side, and one table on the right beyond the white partition wall. No other tables.
- Along the far-left back wall: a long built-in upholstered dark brown sofa bench (the low dark brown block).
- The black blocks are black upholstered benches (no separate chairs). Do not add chairs at the tables.
- At the back: a long bar counter with a dark front and wood top, seven wooden bar stools on the near side, and a wall-mounted bottle shelf full of liquor bottles on the far back wall behind the counter.
- On the right near wall: a wall-mounted black TV, a small white wall-hung hand basin (Mirattap Pratico R style) under it, and wooden toilet doors.
- Ceiling 2400mm, flat, small black recessed downlights only (no pendant lights). Grey polished concrete floor.
Do not add windows, do not add extra TVs or basins. No people. No text."""
VAR = {
 "GN": ("white", "night", "Walls and ceiling: off-white textured wallpaper. Night bar mood: warm 2700K downlights, warm LED tape glow under the counter top and behind the bottle shelf."),
 "GD": ("white", "day", "Walls and ceiling: off-white textured wallpaper. Daytime lunch: bright, all downlights on, NO glow under the counter and the bottle shelf lights OFF. No sunlight or windows visible."),
 "CN": ("charcoal", "night", "Walls and ceiling: charcoal grey matte finish. Night bar mood: warm 2700K downlights, warm LED tape glow under the counter top and behind the bottle shelf."),
 "CD": ("charcoal", "day", "Walls and ceiling: charcoal grey matte finish. Daytime lunch: bright, all downlights on, NO glow under the counter and the bottle shelf lights OFF. No sunlight or windows visible."),
}
REF = {"GN": "ref_old_1.jpg", "GD": "ref_old_2.jpg", "CN": "ref_old_3.jpg", "CD": "ref_old_4.jpg"}
def b64(p): return base64.b64encode(p.read_bytes()).decode()
def run(v):
    _, _, extra = VAR[v]
    parts = [{"inline_data": {"mime_type": "image/png", "data": b64(D / "shitae_G.png")}},
             {"inline_data": {"mime_type": "image/jpeg", "data": b64(D / REF[v])}},
             {"text": COMMON + "\n" + extra + "\nThe second image is ONLY a reference for materials, colors and lighting mood; its furniture layout is WRONG (too many tables) - ignore its layout."}]
    body = json.dumps({"contents": [{"parts": parts}],
                       "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}}}).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    for n in range(6):
        try:
            req = urllib.request.Request(url, body, {"Content-Type": "application/json", "x-goog-api-key": key()})
            r = json.load(urllib.request.urlopen(req, timeout=300))
            for c in r.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    d = p.get("inline_data") or p.get("inlineData")
                    if d:
                        out = D / f"taiyo_{v}_tables4.jpg"
                        out.write_bytes(base64.b64decode(d["data"])); print("saved", out); return
            print("no image:", json.dumps(r)[:500]); return
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]; print(v, e.code, msg)
            if e.code in (500, 503, 504, 429): time.sleep(90); continue
            return
if __name__ == "__main__":
    for v in (sys.argv[1:] or ["GN", "GD", "CN", "CD"]): run(v)
