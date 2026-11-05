# -*- coding: utf-8 -*-
"""youheki.py の作図をそのまま DXF(R12, Shift_JIS) に書き出す（JW_CAD 読込用）"""
import sys, os, math
import numpy as np

OUTDIR = sys.argv[1]
os.makedirs(OUTDIR, exist_ok=True)
sys.argv = [sys.argv[0], os.path.join(OUTDIR, "_tmp.pdf")]
import youheki as Y
import ezdxf
from ezdxf.enums import TextEntityAlignment as TA

# 図面ごとの実寸倍率（JW 読込時の縮尺）
SCALE = {"S-01": 100, "S-02": 20, "S-03": 1, "S-04": 60, "S-05": 1, "S-06": 150}
NAMES = {"S-01": "S-01_平面割付図", "S-02": "S-02_標準断面配筋図", "S-03": "S-03_目地隅角端部詳細",
         "S-04": "S-04_展開図", "S-05": "S-05_鉄筋加工帳数量表", "S-06": "S-06_電柱回避建柱車検討図"}

LAYERS = {  # name: ACI
    "01_躯体": 7, "02_鉄筋": 1, "03_寸法": 5, "04_文字": 7, "05_目地": 30,
    "06_水抜・排水": 5, "07_補強": 6, "08_地盤・参考": 8, "09_図枠": 7, "10_電柱・電線・仮設": 1,
}

def color_layer(c, kind):
    c = (c or "k").lower()
    if c in ("#c00030", "#d00060", "#0070c0", "#c07000", "#6a3d9a", "#8a5a00", "#fff4e0"):
        return "10_電柱・電線・仮設", {"#c00030": 1, "#d00060": 6, "#0070c0": 5, "#c07000": 30, "#6a3d9a": 6, "#8a5a00": 30, "#fff4e0": 8}[c]
    if c in (Y.RB.lower(), "#e07070", "#b00000"):
        return "02_鉄筋" if kind != "T" else "04_文字", 1
    if c in (Y.DIMC.lower(), "#2a4a8a", "#4060a0"):
        return "03_寸法", 5
    if c in ("#007a3d", "#d06000", "#8a6a20", "#7a5a2a"):
        return "05_目地", 30 if c != "#007a3d" else 3
    if c in ("#1060c0", "#2e8b57"):
        return "06_水抜・排水", 5 if c == "#1060c0" else 3
    if c in ("#7030a0", "#a05000"):
        return "07_補強", 6 if c == "#7030a0" else 30
    if c in ("#555", "#555555", "#666", "#777", "#888", "#8b4513"):
        return "08_地盤・参考", 8
    return ("04_文字" if kind == "T" else "01_躯体"), 7

FIX = {"²": "2", "³": "3", "—": "－", "–": "-", "−": "-"}
def sjis(s):
    out = []
    for ch in s:
        ch = FIX.get(ch, ch)
        try:
            ch.encode("cp932"); out.append(ch)
        except UnicodeEncodeError:
            out.append("?")
    return "".join(out)

def ltype(ls):
    if ls in ("-", None, "solid"):
        return "CONTINUOUS"
    if isinstance(ls, tuple) and len(ls[1]) >= 4:
        return "CENTER"
    return "DASHED"

def hatch_lines(pts, ang, step):
    """多角形内に角度 ang の平行線（用紙mm）"""
    pts = np.array(pts, float)
    u = np.array([math.cos(ang), math.sin(ang)]); n = np.array([-u[1], u[0]])
    proj = pts @ n
    segs = []
    for c in np.arange(proj.min() + step / 2, proj.max(), step):
        ts = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            pa, pb = a @ n - c, b @ n - c
            if (pa < 0) != (pb < 0):
                t = pa / (pa - pb); q = a + (b - a) * t
                ts.append(q @ u)
        ts.sort()
        for k in range(0, len(ts) - 1, 2):
            segs.append((n * c + u * ts[k], n * c + u * ts[k + 1]))
    return segs

class Rec:
    def __init__(self):
        self.items = []

def patch():
    S = Y.Sheet
    o_init, o_L, o_T, o_poly, o_circ, o_save = S.__init__, S.L, S.T, S.poly, S.circ, S.save

    def __init__(self, pdf, title, no, scale):
        self._rec = []
        o_init(self, pdf, title, no, scale)

    def L(self, pts, lw=0.25, ls="-", c="k", z=2):
        self._rec.append(("L", [tuple(map(float, p)) for p in pts], ltype(ls), c))
        o_L(self, pts, lw, ls, c, z)

    def T(self, x, y, s, h=2.5, ha="left", va="baseline", rot=0, c="k", z=5, bold=False, bg=False):
        self._rec.append(("T", float(x), float(y), s, h, ha, va, rot, c))
        o_T(self, x, y, s, h, ha, va, rot, c, z, bold, bg)

    def poly(self, pts, fc="none", ec="k", lw=0.25, hatch=None, z=1, ls="-"):
        P = [tuple(map(float, p)) for p in pts]
        if ec != "none":
            self._rec.append(("P", P, ltype(ls), ec))
        if hatch and "/" in hatch:
            for a, b in hatch_lines(P, math.radians(45), 1.5):
                self._rec.append(("L", [tuple(a), tuple(b)], "CONTINUOUS", "#888"))
        if hatch and "x" in hatch:
            for ang in (45, 135):
                for a, b in hatch_lines(P, math.radians(ang), 1.2):
                    self._rec.append(("L", [tuple(a), tuple(b)], "CONTINUOUS", "#888"))
        o_poly(self, pts, fc, ec, lw, hatch, z, ls)

    def circ(self, x, y, r, fc="none", ec="k", lw=0.2, z=3):
        self._rec.append(("C", float(x), float(y), float(r), ec, fc))
        o_circ(self, x, y, r, fc, ec, lw, z)

    def save(self):
        write_dxf(self)
        o_save(self)

    S.__init__, S.L, S.T, S.poly, S.circ, S.save = __init__, L, T, poly, circ, save

ALIGN = {("left", "baseline"): TA.LEFT, ("center", "baseline"): TA.CENTER, ("right", "baseline"): TA.RIGHT,
         ("left", "bottom"): TA.BOTTOM_LEFT, ("center", "bottom"): TA.BOTTOM_CENTER, ("right", "bottom"): TA.BOTTOM_RIGHT,
         ("left", "center"): TA.MIDDLE_LEFT, ("center", "center"): TA.MIDDLE_CENTER, ("right", "center"): TA.MIDDLE_RIGHT,
         ("left", "top"): TA.TOP_LEFT, ("center", "top"): TA.TOP_CENTER, ("right", "top"): TA.TOP_RIGHT}

def write_dxf(sh):
    k = SCALE[sh.no]
    doc = ezdxf.new("R12", setup=True)
    doc.encoding = "cp932"
    doc.header["$LTSCALE"] = k
    for name, aci in LAYERS.items():
        doc.layers.add(name, color=aci)
    msp = doc.modelspace()
    X = lambda p: (p[0] * k, p[1] * k)
    for it in sh._rec:
        kind = it[0]
        if kind in ("L", "P"):
            _, pts, lt, c = it
            lay, aci = color_layer(c, "L")
            if kind == "L" and pts[0] in (None,):
                continue
            if sh.no in ("S-01", "S-02", "S-03", "S-04", "S-05") and False:
                pass
            if _is_frame(pts):
                lay = "09_図枠"
            if len(pts) == 2:
                msp.add_line(X(pts[0]), X(pts[1]), dxfattribs={"layer": lay, "color": aci, "linetype": lt})
            else:
                msp.add_polyline2d([X(p) for p in pts], close=(kind == "P"),
                                   dxfattribs={"layer": lay, "color": aci, "linetype": lt})
        elif kind == "C":
            _, x, y, r, ec, fc = it
            lay, aci = color_layer(ec, "L")
            msp.add_circle(X((x, y)), r * k, dxfattribs={"layer": lay, "color": aci})
        elif kind == "T":
            _, x, y, s, h, ha, va, rot, c = it
            lay, aci = color_layer(c, "T")
            if y < 35 and x > 9:
                lay = "09_図枠"
            lines = str(s).split("\n")
            for i, line in enumerate(lines):
                if not line.strip():
                    continue
                dy = -i * (h + 0.9)
                ox = -math.sin(math.radians(rot)) * dy; oy = math.cos(math.radians(rot)) * dy
                t = msp.add_text(sjis(line), height=h * 0.8 * k,
                                 dxfattribs={"layer": lay, "color": aci, "rotation": rot, "style": "STANDARD"})
                t.set_placement(X((x + ox, y + oy)), align=ALIGN.get((ha, va), TA.LEFT))
    path = os.path.join(OUTDIR, f"大信薬局様邸_擁壁_{NAMES[sh.no]}.dxf")
    doc.saveas(path, encoding="cp932")
    print(path, len(sh._rec), "S=1/%d" % k)

def _is_frame(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return (max(ys) <= 34.5 and min(ys) >= 9.5) or (len(pts) >= 4 and (max(xs) - min(xs)) > 395)

if __name__ == "__main__":
    patch()
    from matplotlib.backends.backend_pdf import PdfPages
    with PdfPages(os.path.join(OUTDIR, "_tmp.pdf")) as pdf:
        Y.sheet_plan(pdf); Y.sheet_section(pdf); Y.sheet_details(pdf); Y.sheet_elev(pdf); Y.sheet_bars(pdf); Y.sheet_pole(pdf)
    for f in os.listdir(OUTDIR):
        if f.startswith("_tmp") or f.endswith(".png"):
            os.remove(os.path.join(OUTDIR, f))
