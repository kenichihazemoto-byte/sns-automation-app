"""GN（白い壁・夜, テーブル4台）を元に、壁の色・昼夜だけを変えた版を作る。
使い方: python3 scripts/gemini-taiyo-tables4-recolor.py GD CN CD"""
import base64, json, sys, time, urllib.request, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / "docs/taiyo-perse/v2_tables4"
MODEL = "gemini-2.5-flash-image"
KEEP = """Edit this photo of a dining bar interior. Keep EVERYTHING else exactly the same: the camera angle, the room shape, every piece of furniture and its position and count (exactly four wooden tables, the dark brown sofa bench, the black cube benches, the bar counter with its stools, the bottle shelf, the TV, the small white hand basin, the doors). Do NOT add chairs, tables, windows, people or text. Do NOT remove anything.
Make it look like a high-quality real photograph.
Change ONLY the following:"""
CH = {
 "GD": "Daytime lunch scene: bright, clean, all ceiling downlights on with neutral warm-white light. Turn OFF the warm LED glow under the bar counter top and turn OFF the lights in the bottle shelf. Walls and ceiling stay off-white.",
 "CN": "Paint all walls, pillars and the ceiling a matte charcoal grey. Keep the night bar mood: warm 2700K downlights, warm LED glow under the counter top and inside the bottle shelf.",
 "CD": "Paint all walls, pillars and the ceiling a matte charcoal grey. Daytime lunch scene: bright, all ceiling downlights on. Turn OFF the warm LED glow under the bar counter top and turn OFF the lights in the bottle shelf.",
}
def run(v):
    src = D / "taiyo_GN_tables4.jpg"
    body = json.dumps({"contents": [{"parts": [
        {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(src.read_bytes()).decode()}},
        {"text": KEEP + "\n" + CH[v]}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}}}).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    for n in range(6):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(url, body, {"Content-Type": "application/json"}), timeout=300))
            for c in r.get("candidates", []):
                for p in c.get("content", {}).get("parts", []):
                    d = p.get("inline_data") or p.get("inlineData")
                    if d:
                        out = D / f"taiyo_{v}_tables4.jpg"; out.write_bytes(base64.b64decode(d["data"])); print("saved", out); return
            print("no image", json.dumps(r)[:300]); return
        except urllib.error.HTTPError as e:
            print(v, e.code, e.read().decode()[:200])
            if e.code in (429, 500, 503, 504): time.sleep(90); continue
            return
for v in sys.argv[1:] or ["GD", "CN", "CD"]: run(v)
