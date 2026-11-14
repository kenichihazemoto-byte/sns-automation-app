# -*- coding: utf-8 -*-
"""大信薬局様邸新築工事  擁壁施工図 作図スクリプト（A3横・PDF）"""
import math, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib import font_manager as fm
from matplotlib.patches import Polygon, Circle, Rectangle

FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
fm.fontManager.addfont(FONT)
plt.rcParams["font.family"] = fm.FontProperties(fname=FONT).get_name()
plt.rcParams["hatch.linewidth"] = 0.3

OUT = sys.argv[1] if len(sys.argv) > 1 else "youheki.pdf"
PT = 1 / 0.3528          # mm -> pt
RB = "#c00000"           # 鉄筋色
DIMC = "#1f3f9f"         # 寸法色
DATE = "2026/11/14"

# ============================================================== 基本諸元
H_TOP, GL, WJ, F_TOP, F_BOT = 200, 0, -1060, -1400, -1900   # レベル(mm, ±0基準)
T_WALL, B_FOOT, T_FOOT = 250, 3000, 500
C_WALL, C_FOOT = 80, 100
D13, D10 = 13, 10
P = 300
LAP = 520           # 重ね継手 40d (D13)
W_D13, W_D10 = 0.995, 0.560   # kg/m

# 平面（m, 北面壁外面を x 軸、NW隅角を原点、y上=北）
rad = math.radians
L_W, L_N_B, L_E = 9.900, 28.460, 7.120   # 境界長（西・北・東）
A_W, A_E = 257.5, 249.1          # 西面・東面壁の方向角（配置図読取）
# 改3：電柱回避のため西面を北面に沿って敷地内側へ SHIFT_W 平行移動（北面は SHIFT_W 短縮）
SHIFT_W = 3.000
D_W = np.array([math.cos(rad(A_W)), math.sin(rad(A_W))])   # NW→SW 方向
BNW = np.array([0.0, 0.0])                     # 境界 NW 角（原点）
BSW = BNW + L_W * D_W                          # 境界 SW 角
NW = np.array([SHIFT_W, 0.0])                  # 擁壁 NW 隅角（新）
NE = np.array([L_N_B, 0.0])
L_N = L_N_B - SHIFT_W                          # 北面 擁壁延長
SW = NW + L_W * D_W                            # 新西面は境界と平行・道路境界まで（延長同じ）
SE = NE + L_E * np.array([math.cos(rad(A_E)), math.sin(rad(A_E))])
OUTER = [SW, NW, NE, SE]
N_IN_W = np.array([-D_W[1], D_W[0]]) * -1      # 西面の敷地側法線
N_IN_W = N_IN_W if N_IN_W[0] > 0 else -N_IN_W
OFF_W = float(np.dot(NW - BNW, N_IN_W))        # 境界～新西面外面の離れ（直角）

# 電柱（配置図への手書き指示：西境界から850・北境界から2,000。位置は要実測）
POLE_DW, POLE_DN, POLE_R = 0.850, 2.000, 0.175  # 電柱径 φ350 と仮定
_t = (POLE_DN + POLE_DW * N_IN_W[1]) / -D_W[1]
POLE = BNW + D_W * _t + N_IN_W * POLE_DW
POLE_CLR_REQ = 1.0                              # 電柱から擁壁（基礎）まで必要離れ
POLE_TO_WALL = float(np.dot(NW - POLE, N_IN_W))  # 電柱芯～新西面外面
POLE_S_W = float(np.dot(POLE - NW, D_W))         # 電柱の新西面上の投影位置（NW隅から）
WIRE_DIR = np.array([29.42, -9.646]) / np.linalg.norm([29.42, -9.646])   # 上空線の方向（調査位置図読取）
KBM_OFF = 250   # 調査位置図 KBM±0 ＝ 本図 ±0-250 相当（照合値）

# 目地位置（外面に沿った、各隅角部からの距離 m）
EJ_N = [5.300, 20.400]                                  # 伸縮目地（北面, 新NW隅から）
CJ_N = [2.650, 9.075, 12.850, 16.625, 22.930]           # 誘発目地（北面, 新NW隅から）
CJ_W = [6.900]          # 誘発目地（西面, NW隅から）改3-1：無改良補強区間（0～6.5m）には設けない

# ---- 改3-1：電線下 無改良区間（柱状改良を打設できない範囲）と底盤補強
GAP_T0, GAP_T1 = 0.70, 5.00      # 西面 NW隅からの範囲（底盤全幅で改良体なし。電線から左右2.0m＝推定）
GAP_EXT = 1.50                   # 補強筋を改良区間へ延ばす長さ
RZ_T0, RZ_T1 = 0.0, GAP_T1 + GAP_EXT   # 補強区間（NW隅から）
EB_B, EB_D = 0.50, 1.00          # ヒール端 補強梁（上がり梁）幅・せい（底盤共）
EB_T0 = 0.50                     # 補強梁の北端（NW隅から、北面底盤内に定着）
W_BAR = {"D10": 0.560, "D13": 0.995, "D16": 1.56, "D19": 2.25, "D22": 3.04}
FT = {"SD295": 195.0, "SD345": 215.0}      # 長期許容引張 N/mm²
AS = {"D13": 126.7, "D16": 198.6, "D19": 286.5, "D22": 387.1}

def gap_calc():
    """無改良区間の補強検討（長期・許容応力度。無改良区間の地盤反力は無視）"""
    g_s, g_c = 18.0, 24.0
    q_heel = 1.4 * g_s + 10.0 + 0.5 * g_c                 # ヒール上 土＋積載＋底盤 kN/m²
    w_tot = 0.25 * 1.6 * g_c + 3.0 * 0.5 * g_c + 2.75 * 1.4 * g_s + 10.0 * 2.75   # 全断面 kN/m
    w_tot += (EB_B * (EB_D - 0.5)) * (g_c - g_s)          # 上がり梁（土との置換分）
    l_h = 2.75 - EB_B / 2 + 0.125                           # ヒール版スパン（立上り芯～補強梁芯）
    w_e = q_heel * (l_h / 2 + EB_B / 2) + EB_B * (EB_D - 0.5) * (g_c - g_s)
    w_s = w_tot - w_e
    # 補強梁 北側支点：西面ヒール端線が北面底盤内側線（y=-3.0）と交わる位置
    t_ic = (3.0 + (NW + N_IN_W * 3.0)[1]) / -D_W[1]
    L_s = (GAP_T1 - GAP_T0) + 0.5
    L_e = (GAP_T1 - t_ic) + 0.5
    res = {}
    def beam(name, w, L, d, bars_t, bars_c, b_web):
        M = w * L ** 2 / 8; V = w * L / 2
        j = 7 / 8 * d
        At_req = M * 1e6 / (FT["SD345"] * j)
        Ma = sum(AS[dia] * n * FT[g] for dia, n, g in bars_t) * j / 1e6
        tau = V * 1e3 / (b_web * j)
        res[name] = dict(w=w, L=L, M=M, V=V, d=d, j=j, At_req=At_req, Ma=Ma, tau=tau)
    # 立上り＋底盤（壁際）：引張 底盤下端壁際 3-D19＋既存D13×2、上端側 天端 2-D19＋既存2-D13
    beam("stem", w_s, L_s, 2100 - 100 - 10, [("D19", 3, "SD345"), ("D13", 2, "SD295")], None, 250)
    beam("stemTop", w_s, L_s, 2100 - 100 - 10, [("D19", 2, "SD345"), ("D13", 2, "SD295")], None, 250)
    beam("edge", w_e, L_e, EB_D * 1000 - 100 - 13 - 10, [("D19", 3, "SD345")], None, EB_B * 1000)
    Mh = q_heel * l_h ** 2 / 8; dh = 500 - 100 - 6.5; jh = 7 / 8 * dh
    Ah_req = Mh * 1e6 / (195 * jh); Ah = AS["D13"] * (1000 / 150)
    res["heel"] = dict(q=q_heel, l=l_h, M=Mh, At_req=Ah_req, At=Ah, Ma=Ah * 195 * jh / 1e6)
    res.update(q_heel=q_heel, w_tot=w_tot, w_s=w_s, w_e=w_e, L_s=L_s, L_e=L_e, t_ic=t_ic,
               R_south=w_s * L_s / 2 + w_e * L_e / 2, R_corner=w_s * L_s / 2 + w_e * L_e / 2)
    return res

GAP = gap_calc()
CJ_E = [3.560]                                           # 誘発目地（東面, NE隅から）

# 外部地盤（配置図読取・参考）mm
FRONT = -1500          # 前面地盤 嵩上げ後の天端（根入れ400確保）
FK_W = 1.500           # 西面のふかし・嵩上げ範囲（NW隅から, 既存地盤が-1500以下の区間＋余裕）
FK_T = 300             # 前面ふかしコンクリート幅

def ext_ground0(wall, s):
    """既存の外部地盤（配置図読取）"""
    if wall == "W":   # 新西面の前面（旧境界との帯状部）：旧境界外の地盤と同じ NW(-1660)→南端(-210) と仮定（要協議）
        return -1660 + 1450 * s / L_W
    if wall == "N":
        return -1660 - 20 * (s + SHIFT_W) / L_N_B
    if wall == "E":   # NE(-1110) → 南端(-130)
        return -1110 + 980 * s / L_E

def ext_ground(wall, s):
    """嵩上げ後の外部地盤"""
    g = ext_ground0(wall, s)
    if wall == "N" or (wall == "W" and s <= FK_W):
        return max(g, FRONT)
    return g

def weep_level(g):
    if g <= -1210:
        return WJ, "A"
    if g <= -650:
        return int(math.ceil((g + 150) / 50.0) * 50), "B"
    return None, "C"

def holes_in_bay(a, b, ca, cb):
    Lp = (b - a) - ca - cb
    n = int(math.ceil(Lp / 1.5 - 1e-9)) + 1
    if n == 1:
        return [a + ca + Lp / 2]
    return [a + ca + Lp * i / (n - 1) for i in range(n)]

def weep_holes():
    res = {"W": [], "N": [], "E": []}
    # 西面: NW隅(0) → 端部(9.9)
    pts = [0.0] + CJ_W + [L_W]
    for i in range(len(pts) - 1):
        ca = 0.9 if i == 0 else 0.4
        res["W"] += holes_in_bay(pts[i], pts[i + 1], ca, 0.4)
    pts = [0.0] + sorted(EJ_N + CJ_N) + [L_N]
    for i in range(len(pts) - 1):
        ca = 0.9 if i == 0 else 0.4
        cb = 1.0 if i == len(pts) - 2 else 0.4
        res["N"] += holes_in_bay(pts[i], pts[i + 1], ca, cb)
    pts = [0.0] + CJ_E + [L_E]
    for i in range(len(pts) - 1):
        ca = 1.0 if i == 0 else 0.4
        res["E"] += holes_in_bay(pts[i], pts[i + 1], ca, 0.4)
    out = {}
    for w, lst in res.items():
        out[w] = []
        for s in lst:
            g = ext_ground(w, s)
            lv, z = weep_level(g)
            out[w].append((round(s, 3), g, lv, z))
    return out

WEEP = weep_holes()

# ============================================================== 幾何ユーティリティ
def unit(v):
    return v / np.linalg.norm(v)

def rnorm(d):  # 進行方向右側（=敷地側）法線
    return np.array([d[1], -d[0]])

def line_int(p1, d1, p2, d2):
    A = np.array([d1, -d2]).T
    t = np.linalg.solve(A, p2 - p1)
    return p1 + t[0] * d1

def offset_poly(pts, off):
    """外面ポリライン SW→NW→NE→SE を敷地側へ off(m) オフセット。
    SW端は道路境界(水平)で切断、SE端は壁直角で切断。"""
    segs = []
    for i in range(len(pts) - 1):
        d = unit(pts[i + 1] - pts[i])
        segs.append((pts[i] + rnorm(d) * off, d))
    res = []
    # SW端: y = SW.y の水平線との交点
    p, d = segs[0]
    res.append(line_int(p, d, np.array([0, SW[1]]), np.array([1.0, 0])))
    for i in range(len(segs) - 1):
        res.append(line_int(segs[i][0], segs[i][1], segs[i + 1][0], segs[i + 1][1]))
    p, d = segs[-1]
    res.append(SE + rnorm(d) * off)
    return res

def poly_area(pts):
    x = np.array([p[0] for p in pts]); y = np.array([p[1] for p in pts])
    return 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))

def plen(pts):
    return sum(np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1))

INNER_W = offset_poly(OUTER, T_WALL / 1000)
INNER_F = offset_poly(OUTER, B_FOOT / 1000)

def haunch(idx, a=0.5):
    c = INNER_W[idx]
    p1 = c + unit(INNER_W[idx - 1] - c) * a
    p2 = c + unit(INNER_W[idx + 1] - c) * a
    return [c, p1, p2]

HAUNCH = [haunch(1), haunch(2)]

def ang_deg(idx):
    a = unit(OUTER[idx - 1] - OUTER[idx]); b = unit(OUTER[idx + 1] - OUTER[idx])
    return math.degrees(math.acos(np.clip(np.dot(a, b), -1, 1)))

ANG_NW, ANG_NE = ang_deg(1), ang_deg(2)

def on_wall(w, s):
    """壁外面上の点と方向（壁に沿う単位ベクトル、敷地側法線）"""
    if w == "W":
        d = unit(SW - NW); p = NW + d * s
    elif w == "N":
        d = unit(NE - NW); p = NW + d * s
    else:
        d = unit(SE - NE); p = NE + d * s
    n = unit(rnorm(unit(OUTER[1] - OUTER[0]))) if w == "W" else (
        np.array([0.0, -1.0]) if w == "N" else unit(rnorm(unit(SE - NE))))
    return p, d, n

# ============================================================== 数量
A_FOOT = poly_area(OUTER + INNER_F[::-1])
A_WALL = poly_area(OUTER + INNER_W[::-1])
A_HAUN = sum(poly_area(h) for h in HAUNCH)
V_FOOT = A_FOOT * T_FOOT / 1000
V_WALL = (A_WALL + A_HAUN) * (H_TOP - F_TOP) / 1000
L_OUT = plen(OUTER); L_INW = plen(INNER_W); L_INF = plen(INNER_F)

# ============================================================== 作図基盤
class Sheet:
    def __init__(self, pdf, title, no, scale):
        self.pdf, self.title, self.no, self.scale = pdf, title, no, scale
        self.fig = plt.figure(figsize=(420 / 25.4, 297 / 25.4))
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, 420); self.ax.set_ylim(0, 297)
        self.ax.set_aspect("equal"); self.ax.axis("off")
        self.frame()

    # ---- primitives (paper mm)
    def L(self, pts, lw=0.25, ls="-", c="k", z=2):
        pts = np.array(pts)
        self.ax.plot(pts[:, 0], pts[:, 1], lw=lw * PT * 0.5, ls=ls, color=c, zorder=z,
                     solid_capstyle="butt")

    def T(self, x, y, s, h=2.5, ha="left", va="baseline", rot=0, c="k", z=5, bold=False, bg=False):
        kw = {}
        if bg:
            kw["bbox"] = dict(fc="white", ec="none", pad=0.3)
        self.ax.text(x, y, s, fontsize=h * PT / 1.0 * 0.95, ha=ha, va=va, rotation=rot,
                     color=c, zorder=z, rotation_mode="anchor",
                     fontweight="bold" if bold else "normal", **kw)

    def poly(self, pts, fc="none", ec="k", lw=0.25, hatch=None, z=1, ls="-"):
        self.ax.add_patch(Polygon(np.array(pts), closed=True, fc=fc, ec=ec, lw=lw * PT * 0.5,
                                  hatch=hatch, zorder=z, ls=ls))

    def circ(self, x, y, r, fc="none", ec="k", lw=0.2, z=3):
        self.ax.add_patch(Circle((x, y), r, fc=fc, ec=ec, lw=lw * PT * 0.5, zorder=z))

    def dim(self, p1, p2, off, text=None, h=2.2, ext=True, c=DIMC, flip=False):
        p1 = np.array(p1, float); p2 = np.array(p2, float)
        u = unit(p2 - p1); n = np.array([-u[1], u[0]])
        a1, a2 = p1 + n * off, p2 + n * off
        if ext:
            sgn = 1 if off >= 0 else -1
            self.L([p1 + n * sgn * 0.8, a1 + n * sgn * 1.2], lw=0.12, c=c)
            self.L([p2 + n * sgn * 0.8, a2 + n * sgn * 1.2], lw=0.12, c=c)
        self.L([a1, a2], lw=0.15, c=c)
        t = unit(u + n) * 1.0
        for a in (a1, a2):
            self.L([a - t, a + t], lw=0.3, c=c)
        if text is None:
            return
        ang = math.degrees(math.atan2(u[1], u[0]))
        if ang > 90.01 or ang < -89.99:
            ang -= 180 if ang > 0 else -180
        m = (a1 + a2) / 2
        nn = np.array([-math.sin(rad(ang)), math.cos(rad(ang))])
        m = m + nn * (0.6 if not flip else -0.6 - h)
        self.T(m[0], m[1], text, h=h, ha="center", va="bottom", rot=ang, c=c)

    def leader(self, pts, text, h=2.3, ha="left", c="k", dot=True):
        pts = np.array(pts, float)
        self.L(pts, lw=0.15, c=c)
        if dot:
            self.circ(pts[0][0], pts[0][1], 0.35, fc=c, ec=c)
        x, y = pts[-1]
        lines = text.split("\n")
        for i, s in enumerate(lines):
            self.T(x + (0.8 if ha == "left" else -0.8), y + 0.6 - i * (h + 0.9), s, h=h, ha=ha, va="bottom", c=c)

    def note_box(self, x, y, w, title, lines, h=2.3, lh=3.6):
        self.T(x, y, title, h=3.0, bold=True)
        yy = y - 5
        for s in lines:
            self.T(x, yy, s, h=h)
            yy -= lh
        return yy

    def table(self, x, y, cols, rows, rh=4.6, h=2.2, head_fill="#e8e8e8"):
        widths = [c[1] for c in cols]
        tw = sum(widths)
        self.ax.add_patch(Rectangle((x, y - rh), tw, rh, fc=head_fill, ec="none", zorder=0))
        allr = [[c[0] for c in cols]] + rows
        for r, row in enumerate(allr):
            yy = y - r * rh
            xx = x
            for k, cell in enumerate(row):
                al = cols[k][2] if len(cols[k]) > 2 else "center"
                tx = xx + widths[k] / 2 if al == "center" else (xx + 1 if al == "left" else xx + widths[k] - 1)
                self.T(tx, yy - rh / 2, str(cell), h=h, ha=al, va="center")
                xx += widths[k]
        nr = len(allr)
        for r in range(nr + 1):
            self.L([[x, y - r * rh], [x + tw, y - r * rh]], lw=0.2 if r not in (0, 1, nr) else 0.35)
        xx = x
        for wdt in [0] + widths:
            xx += wdt
            self.L([[xx, y], [xx, y - nr * rh]], lw=0.2)
        self.L([[x, y], [x, y - nr * rh]], lw=0.35)
        self.L([[x + tw, y], [x + tw, y - nr * rh]], lw=0.35)
        return y - nr * rh

    # ---- 図枠・表題欄
    def frame(self):
        self.L([[8, 8], [412, 8], [412, 289], [8, 289], [8, 8]], lw=0.7)
        self.L([[10, 10], [410, 10], [410, 287], [10, 287], [10, 10]], lw=0.3)
        y0, y1, ym = 10, 34, 22
        self.L([[10, y1], [410, y1]], lw=0.5)
        xs = [10, 88, 205, 232, 259, 286, 370, 410]
        for x in xs[1:-1]:
            self.L([[x, y0], [x, y1]], lw=0.3)
        for a, b in [(10, 88), (205, 286), (286, 370)]:
            self.L([[a, ym], [b, ym]], lw=0.2)
        self.T(11, 31, "工事名", h=2.0); self.T(49, 25, "大信薬局様邸新築工事", h=3.2, ha="center")
        self.T(11, 19, "備考", h=2.0); self.T(49, 16, "鉄筋・型枠・土工 協力業者配布用", h=2.1, ha="center")
        self.T(49, 12, "改3-2 2026/11/14 電柱側 矢板なし（S-06）・ガラ／割栗石の場内再利用（VE）／改3-1 11/11 電線下補強", h=1.6, ha="center", c="#b00000")
        self.T(146, 25.5, "ハゼモト建設株式会社", h=5.0, ha="center", bold=True)
        self.T(146, 19.5, "一級建築士事務所", h=2.3, ha="center")
        self.T(146, 13.5, "北九州市小倉北区片野4-12-10  TEL 093-931-0521  FAX 093-931-0927", h=2.0, ha="center")
        for x, s in [(205, "管理者"), (232, "設計者"), (259, "担当者")]:
            self.T(x + 1, 31, s, h=2.0); self.T(x + 1, 19, "日付", h=2.0)
        self.T(218.5, 25, "櫨本 健一", h=2.2, ha="center")
        self.T(218.5, 13, DATE, h=2.0, ha="center")
        self.T(287, 31, "図面名", h=2.0)
        self.T(328, 24.5, self.title, h=4.0, ha="center", bold=True)
        self.T(287, 19, "縮尺", h=2.0); self.T(328, 13, self.scale, h=3.0, ha="center")
        self.T(371, 31, "図面No", h=2.0); self.T(390, 18, self.no, h=6.0, ha="center", bold=True)
        self.T(390, 12, "施工図", h=2.0, ha="center")

    def save(self):
        self.pdf.savefig(self.fig)
        self.fig.savefig(OUT.replace(".pdf", f"_{self.no}.png"), dpi=110)
        plt.close(self.fig)

class View:
    """モデル座標 → 用紙座標 変換"""
    def __init__(self, ox, oy, scale, unit_mm=1.0):
        self.ox, self.oy, self.k = ox, oy, unit_mm / scale
    def __call__(self, x, y=None):
        if y is None:
            x, y = x
        return np.array([self.ox + x * self.k, self.oy + y * self.k])
    def P(self, pts):
        return [self(p) for p in pts]

def gravel(sh, v, x0, y0, x1, y1, seed=1):
    rng = np.random.default_rng(seed)
    sh.poly(v.P([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]), fc="#f2f2f2", lw=0.2)
    for _ in range(int(abs((x1 - x0) * (y1 - y0)) / 2600)):
        cx = rng.uniform(x0 + 18, x1 - 18); cy = rng.uniform(y0 + 18, y1 - 18)
        r = rng.uniform(10, 22)
        p = v(cx, cy)
        sh.circ(p[0], p[1], r * v.k, lw=0.15, z=2)

def soil_hatch(sh, v, x0, x1, y, step=150, ln=80):
    for x in np.arange(x0, x1, step):
        sh.L([v(x, y), v(x + ln * 0.6, y - ln)], lw=0.15, c="#555")

def bar_dot(sh, p, d=D13, v=None):
    r = max(0.38, d * v.k / 2)
    sh.circ(p[0], p[1], r, fc=RB, ec=RB, lw=0.1, z=6)

# ============================================================== 電柱（共通作図）
POLE_C = "#c00030"

def wire_end():
    t = (BSW[1] - POLE[1]) / WIRE_DIR[1]
    return POLE + WIRE_DIR * t

def plan_pole(sh, v, dims=True, label=True, wire=True):
    """平面図に電柱・離隔範囲・上空線・帯状部を描く（v はモデル m → 用紙）"""
    # 旧西面（境界）～新西面の帯状部
    sh.poly(v.P([BNW, NW, SW, BSW]), fc="#fff4e0", ec="none", z=0)
    p = v((BNW + BSW) / 2 * 0.62 + (NW + SW) / 2 * 0.38 + D_W * 1.6)
    if label:
        sh.T(p[0], p[1], f"帯状部 W≒{OFF_W*1000:,.0f}（旧西面位置～新西面）", h=1.7, rot=math.degrees(math.atan2(D_W[1], D_W[0])) + 180,
             ha="center", va="center", c="#8a5a00")
    # 上空線
    if wire:
        we = wire_end()
        sh.L(v.P([POLE, we]), lw=0.35, ls=(0, (10, 2, 2, 2)), c="#d00060", z=9)
        q = v(POLE + WIRE_DIR * 17.5)
        sh.T(q[0], q[1] + 0.8, "上空線（電線）  高さ要実測", h=1.9, rot=math.degrees(math.atan2(WIRE_DIR[1], WIRE_DIR[0])),
             c="#d00060", ha="center", va="bottom")
    # 離隔 1.0m 範囲
    c = v(POLE)
    sh.circ(c[0], c[1], (POLE_R + POLE_CLR_REQ) * v.k, ec=POLE_C, lw=0.25, z=9)
    sh.circ(c[0], c[1], POLE_R * v.k, fc=POLE_C, ec=POLE_C, lw=0.2, z=10)
    if label:
        sh.leader([c + np.array([-0.6, 0.6]), c + np.array([-9, 9]), c + np.array([-12, 9])],
                  "電柱（支柱付）推定位置\n周囲1.0m 掘削・盛土禁止", h=1.9, ha="right", c=POLE_C)
    if dims:
        # 西境界からの離れ・北境界からの離れ・新西面までの離れ
        f_b = POLE - N_IN_W * POLE_DW
        sh.dim(v(f_b), v(POLE), 0, None, c=POLE_C)
        m = v((f_b + POLE) / 2); sh.T(m[0], m[1] - 2.6, f"{POLE_DW*1000:,.0f}", h=1.7, ha="center", c=POLE_C)
        nb = np.array([POLE[0], 0.0])
        sh.dim(v(nb), v(POLE), 0, None, c=POLE_C)
        m = v((nb + POLE) / 2); sh.T(m[0] + 0.8, m[1], f"{POLE_DN*1000:,.0f}", h=1.7, va="center", c=POLE_C)
        fw = POLE + N_IN_W * POLE_TO_WALL
        sh.dim(v(POLE), v(fw), 0, None, c=POLE_C)
        m = v((POLE + fw) / 2); sh.T(m[0], m[1] + 0.9, f"{POLE_TO_WALL*1000:,.0f}", h=1.7, ha="center", c=POLE_C)

# ============================================================== S-01 平面割付図
def sheet_plan(pdf):
    sh = Sheet(pdf, "擁壁 平面割付図", "S-01", "1/100")
    v = View(62, 243, 100, unit_mm=1000)   # model m -> paper: 1m = 10mm
    # 道路・境界
    road_pts = [BSW, BSW + np.array([25.4, 0]), SE]
    sh.L(v.P([BSW, BNW, NE, SE]), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    sh.L(v.P(road_pts), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    sh.T(*v(11.5, -9.665 - 0.9), "道路境界線 25.400", h=2.0, ha="center", c="#555")
    sh.T(*v(19.0, -10.9), "道路", h=3.0, c="#555"); sh.T(*v(31.3, -6.0), "道路", h=3.0, c="#555")
    sh.T(*v(-3.6, -7.5), "隣地", h=3.0, c="#555", ha="right"); sh.T(*v(9.5, 2.4), "隣地（北面：隣地境界線＝擁壁外面）", h=2.2, c="#555")
    plan_pole(sh, v)
    # 建物（参考）
    bx = [(10.85, -1.0), (21.85, -1.0), (21.85, -5.6), (10.85, -5.6)]
    sh.poly(v.P(bx), ec="#888", lw=0.2, ls=(0, (4, 2)))
    sh.T(*v(16.35, -4.6), "申請建物（参考・位置は配置図読取）", h=2.0, ha="center", c="#777")
    # 底盤
    sh.poly(v.P(OUTER + INNER_F[::-1]), fc="#eef3fb", ec="#4060a0", lw=0.25, ls=(0, (3, 1.5)))
    # 前面ふかしコン（外側 W300）
    dN = np.array([0.0, FK_T / 1000]); 
    sh.poly(v.P([NW, NE, NE + dN, NW + dN]), fc="#d0d0d0", ec="#b00000", lw=0.3, hatch="xxx", z=3)
    pW, dW, nW = on_wall("W", FK_W)
    sh.poly(v.P([NW, pW, pW - nW * FK_T / 1000, NW - nW * FK_T / 1000 + dN * 0]), fc="#d0d0d0", ec="#b00000", lw=0.3, hatch="xxx", z=3)
    # 電線下 無改良区間・補強梁（S-07）
    sh.poly(v.P([wpt(GAP_T0), wpt(GAP_T1), wpt(GAP_T1, 3.0), wpt(GAP_T0, 3.0)]), fc="#fde3e8", ec="#c00030", lw=0.3, hatch="\\\\\\", z=2)
    sh.poly(v.P([wpt(EB_T0, 3.0 - EB_B), wpt(RZ_T1, 3.0 - EB_B), wpt(RZ_T1, 3.0), wpt(EB_T0, 3.0)]), fc="#e8dcf5", ec="#6a3d9a", lw=0.3, z=3)
    q = v(wpt((GAP_T0 + GAP_T1) / 2, 3.0))
    sh.leader([q, q + np.array([10, -4]), q + np.array([12, -4])], "電線下 無改良区間＋補強梁 → S-07", h=1.9, c="#c00030")
    # 壁
    sh.poly(v.P(OUTER + INNER_W[::-1]), fc="#bbbbbb", ec="k", lw=0.5, hatch="////", z=3)
    for h in HAUNCH:
        sh.poly(v.P(h), fc="#999999", ec="k", lw=0.35, z=3)
    sh.T(*v(9.3, -2.3), "底盤（ヒール）範囲  B=3,000", h=2.3, c="#2a4a8a")
    sh.T(*v(5.9, -6.3), "底盤", h=2.3, c="#2a4a8a")
    sh.T(*v(25.4, -3.4), "底盤", h=2.3, c="#2a4a8a")
    # 伸縮目地
    for i, s in enumerate(EJ_N):
        a = v(s, 0.35); b = v(s, -3.15)
        sh.L([a, b], lw=0.9, c="#d06000", z=7)
        sh.T(b[0], b[1] - 3.2, f"EJ-{i+1}", h=2.6, ha="center", c="#d06000", bold=True)
    # 誘発目地
    def cj_mark(w, s, lab):
        p, d, n = on_wall(w, s)
        a = v(p - n * 0.25); b = v(p + n * 0.50)
        sh.L([a, b], lw=0.5, c="#007a3d", z=7)
        q = v(p + n * 0.75)
        sh.T(q[0], q[1], lab, h=2.0, ha="center", va="center", c="#007a3d", bold=True)
    k = 1
    for s in CJ_W:
        cj_mark("W", s, f"CJ-{k}"); k += 1
    for s in sorted(CJ_N):
        cj_mark("N", s, f"CJ-{k}"); k += 1
    for s in CJ_E:
        cj_mark("E", s, f"CJ-{k}"); k += 1
    # 水抜穴
    for w in "WNE":
        for s, g, lv, z in WEEP[w]:
            if lv is None:
                continue
            p, d, n = on_wall(w, s)
            q = v(p + n * 0.125)
            sh.circ(q[0], q[1], 0.55, fc="white" if z == "B" else "#1060c0", ec="#1060c0", lw=0.3, z=8)
    # 寸法（外面）
    def chain(w, marks, off):
        pts = [0.0] + marks
        for i in range(len(pts) - 1):
            p1, _, _ = on_wall(w, pts[i]); p2, _, _ = on_wall(w, pts[i + 1])
            sh.dim(v(p1), v(p2), off, f"{(pts[i+1]-pts[i])*1000:,.0f}", h=1.9)
    chain("N", sorted(EJ_N + CJ_N) + [L_N], 6.0)
    sh.dim(v(NW), v(NE), 11.0, f"擁壁 {L_N*1000:,.0f}", h=2.3)
    sh.dim(v(BNW), v(NW), 6.0, f"{SHIFT_W*1000:,.0f}", h=1.9, c="#b00000")
    sh.dim(v(BNW), v(NE), 16.0, f"隣地境界線 {L_N_B*1000:,.0f}", h=2.1, c="#555")
    # 西面（NW→SW 方向は y 下向き → 外側は左）
    pts = [0.0] + CJ_W + [L_W]
    for i in range(len(pts) - 1):
        p1, _, _ = on_wall("W", pts[i]); p2, _, _ = on_wall("W", pts[i + 1])
        sh.dim(v(p2), v(p1), 5.0, f"{(pts[i+1]-pts[i])*1000:,.0f}", h=1.9)
    sh.dim(v(SW), v(NW), 10.0, f"{L_W*1000:,.0f}", h=2.3)
    pts = [0.0] + CJ_E + [L_E]
    for i in range(len(pts) - 1):
        p1, _, _ = on_wall("E", pts[i]); p2, _, _ = on_wall("E", pts[i + 1])
        sh.dim(v(p1), v(p2), 5.0, f"{(pts[i+1]-pts[i])*1000:,.0f}", h=1.9)
    sh.dim(v(NE), v(SE), 10.0, "7,120", h=2.3)
    # 隅角部ラベル
    c = v(INNER_W[1])
    sh.leader([c + np.array([1.0, -1.0]), c + np.array([8, -16]), c + np.array([10, -16])],
              f"NW隅角部（内角 約{ANG_NW:.1f}°）ハンチ500×500 → S-03", h=2.0)
    c = v(OUTER[2])
    sh.leader([v(INNER_W[2]) + np.array([-0.6, -0.6]), c + np.array([14, 6]), c + np.array([16, 6])],
              f"NE隅角部（内角 約{ANG_NE:.1f}°）\nハンチ500×500 → S-03", h=2.0)
    sh.leader([v(SW + np.array([0.15, 0.2])), v(SW) + np.array([8, -5]), v(SW) + np.array([10, -5])],
              "西面 端部（道路境界線で止め）", h=2.0)
    sh.leader([v(SE + np.array([-0.15, 0.25])), v(SE) + np.array([10, -4]), v(SE) + np.array([12, -4])],
              "東面 端部\n（壁直角で止め）", h=2.0)
    # 断面記号
    for (x, lab) in [(7.4, "A")]:
        a = v(x, 2.3); b = v(x, -3.8)
        sh.L([a, a - np.array([0, 2.5])], lw=0.5); sh.L([b, b + np.array([0, 4])], lw=0.5)
        sh.L([a, a + np.array([3, 0])], lw=0.5); sh.L([b, b + np.array([3, 0])], lw=0.5)
        sh.T(a[0] + 3.6, a[1] - 1, lab, h=3.0); sh.T(b[0] + 3.6, b[1] - 1, lab, h=3.0)
    sh.T(*v(7.4, -4.9), "A-A断面 → S-02（全周同一断面）", h=2.0, c="k")
    # 方位
    c = np.array([28, 258]); u = np.array([-math.sin(rad(20)), math.cos(rad(20))])
    sh.circ(*c, 5, lw=0.3)
    sh.poly([c + u * 7, c + np.array([u[1], -u[0]]) * 2, c - np.array([u[1], -u[0]]) * 2], fc="k", lw=0.2)
    sh.T(*(c + u * 9.5), "N", h=3.0, ha="center")
    sh.T(c[0], c[1] - 9, "方位は配置図による（参考）", h=1.6, ha="center")
    sh.T(20, 278, "擁壁 平面割付図   S=1/100", h=5.0, bold=True)
    # 凡例
    lx, ly = 210, 122
    sh.T(lx, ly, "凡例", h=3.0, bold=True)
    sh.poly([(lx, ly - 7), (lx + 8, ly - 7), (lx + 8, ly - 4.5), (lx, ly - 4.5)], fc="#bbbbbb", hatch="////", lw=0.4)
    sh.T(lx + 10, ly - 6.8, "立上り t=250", h=2.2)
    sh.poly([(lx, ly - 12), (lx + 8, ly - 12), (lx + 8, ly - 9.5), (lx, ly - 9.5)], fc="#eef3fb", ec="#4060a0", ls=(0, (3, 1.5)))
    sh.T(lx + 10, ly - 11.8, "底盤 B3000 t500", h=2.2)
    sh.L([(lx + 4, ly - 13.5), (lx + 4, ly - 17)], lw=0.9, c="#d06000")
    sh.T(lx + 10, ly - 16.3, "EJ 伸縮目地", h=2.2)
    sh.L([(lx + 4, ly - 18.5), (lx + 4, ly - 22)], lw=0.5, c="#007a3d")
    sh.T(lx + 10, ly - 21.3, "CJ 誘発目地", h=2.2)
    sh.circ(lx + 4, ly - 25.3, 0.8, fc="#1060c0", ec="#1060c0")
    sh.T(lx + 10, ly - 26.1, "水抜穴 標準高さ", h=2.2)
    sh.circ(lx + 4, ly - 30.3, 0.8, fc="white", ec="#1060c0", lw=0.4)
    sh.T(lx + 10, ly - 31.1, "水抜穴 高さ調整", h=2.2)
    sh.poly([(lx, ly - 37), (lx + 8, ly - 37), (lx + 8, ly - 34.5), (lx, ly - 34.5)], fc="#d0d0d0", ec="#b00000", hatch="xxx", lw=0.3)
    sh.T(lx + 10, ly - 36.6, "前面ふかしコン", h=2.2)

    # 目地・水抜穴一覧
    rows = []
    rows.append(["西面", f"{L_W*1000:,.0f}", "NW隅から " + " / ".join(f"{x*1000:,.0f}" for x in CJ_W), "—", f"{sum(1 for x in WEEP['W'] if x[2])} 箇所"])
    rows.append(["北面", f"{L_N*1000:,.0f}", "NW隅から " + " / ".join(f"{x*1000:,.0f}" for x in CJ_N),
                 "NW隅から " + " / ".join(f"{x*1000:,.0f}" for x in EJ_N), f"{sum(1 for x in WEEP['N'] if x[2])} 箇所"])
    rows.append(["東面", f"{L_E*1000:,.0f}", "NE隅から 3,560", "—", f"{sum(1 for x in WEEP['E'] if x[2])} 箇所"])
    tot = sum(1 for w in WEEP for x in WEEP[w] if x[2])
    rows.append(["計", f"{(L_W+L_N+L_E)*1000:,.0f}", f"{len(CJ_W)+len(CJ_N)+len(CJ_E)} 箇所", f"{len(EJ_N)} 箇所", f"{tot} 箇所"])
    sh.T(20, 122, "目地・水抜穴 割付表（寸法は擁壁外面＝境界線に沿う）", h=3.0, bold=True)
    yb = sh.table(20, 119, [("面", 14), ("延長", 16), ("誘発目地 CJ 位置", 92), ("伸縮目地 EJ 位置", 42), ("水抜穴", 18)], rows)

    # 水抜穴位置表
    sh.T(20, yb - 6, "水抜穴 位置表（隅角部からの距離 / 芯高さ ±0基準）", h=3.0, bold=True)
    yy = yb - 10
    for w, lab, base in [("W", "西面", "NW隅→南"), ("N", "北面", "NW隅→東"), ("E", "東面", "NE隅→南")]:
        items = []
        for s, g, lv, z in WEEP[w]:
            if lv is None:
                items.append(f"{s*1000:,.0f}(省略)")
            elif z == "B":
                items.append(f"{s*1000:,.0f}[{lv}]")
            else:
                items.append(f"{s*1000:,.0f}")
        text = " / ".join(items)
        sh.T(20, yy, f"{lab}（{base}）:", h=2.1, bold=True)
        # 折り返し
        chunks, cur = [], ""
        for it in items:
            if len(cur) + len(it) > 120:
                chunks.append(cur); cur = ""
            cur += ("" if not cur else " / ") + it
        chunks.append(cur)
        for c_ in chunks:
            sh.T(48, yy, c_, h=2.0); yy -= 3.4
        yy -= 0.6
    sh.T(20, yy - 1, "※無印＝標準高さ GL-1060（止水コン天端に管底）。[ ]内＝調整高さ（外部地盤+150）。(省略)＝外部地盤が高く排水不可のため設けない。",
         h=1.9)
    sh.T(20, yy - 4.4, "※外部地盤は配置図からの読取値。墨出し時に外部地盤高さを実測し、右記ルールで最終高さを決定すること。", h=1.9)

    # 特記
    x0 = 268
    lines = [
        "1. 北面・東面の擁壁外面＝隣地／道路境界線。西面は境界から敷地側へ",
        f"   北面に沿って {SHIFT_W*1000:,.0f} 移動（境界と平行、直角離れ {OFF_W*1000:,.0f}）。NW隅＝新隅角。",
        f"2. 壁角度は配置図読取値（NW隅 約{ANG_NW:.1f}°・NE隅 約{ANG_NE:.1f}°）。",
        "   境界杭にて現地確認のうえ墨出しすること。",
        "3. 伸縮目地 EJ：全断面（立上り＋底盤）縁切り、",
        f"   区間長 {L_W+EJ_N[0]:.1f}m／{EJ_N[1]-EJ_N[0]:.1f}m／{L_N-EJ_N[1]+L_E:.1f}m（≦20m）、隅角部から2m以上離す。",
        "4. 誘発目地 CJ：立上り両面に目地棒、間隔 4.1m以内。",
        "5. 水抜穴：VP75（内径75以上）、1.5m以内ピッチ",
        "   （露出面 約1.9m²/箇所 ≦3m²）、外部へ2%以上の勾配。",
        "   高さルール：外部地盤 ≦GL-1210 → GL-1060(標準)",
        "   　　　　　　GL-1210～-650 → 外部地盤+150",
        "   　　　　　　GL-650 超 → 設けない",
        "6. 隅角部（2箇所）はハンチ500×500＋補強筋（S-03）。",
        "7. 断面・配筋は S-02、目地・隅角・端部詳細は S-03、",
        "   展開図は S-04、鉄筋加工帳・数量は S-05 による。",
        "8. 根入れ：北面全長・西面NW隅から1.5mは前面地盤を ±0-1500 に",
        "   嵩上げ＋前面ふかしコン W300（無筋）で根入れ400を確保。",
        f"9. 電柱（推定位置）：西境界から{POLE_DW*1000:,.0f}・北境界から{POLE_DN*1000:,.0f}。新西面外面まで",
        f"   芯で約{POLE_TO_WALL*1000:,.0f}（表面で約{(POLE_TO_WALL-POLE_R)*1000:,.0f}≧1,000）。電柱・支柱の位置は",
        "   着工前に実測。周囲1.0mは掘削・盛土禁止。施工検討は S-06。",
        f"10.電線下で柱状改良を打てない区間（西面 NW隅から{GAP_T0*1000:,.0f}～{GAP_T1*1000:,.0f}）は",
        "   底盤補強＋ヒール端補強梁で両側の改良区間へ架け渡す（S-07）。",
        "11.【VE・改3-2】解体ガラ（土間コン・ブロック）と割栗石は処分せず場内で再利用。",
        "   裏込め砕石の外側の水はけ層（S-02）・西／東面ヒール上の埋戻し下層・帯状部・",
        "   北側嵩上げの下層。北面ヒール上（建物の下）には使わない。構造設計者の承認後。",
    ]
    sh.note_box(x0, 122, 140, "特記事項", lines, h=2.05, lh=3.35)
    sh.save()

# ============================================================== S-02 標準断面配筋図
def sheet_section(pdf):
    sh = Sheet(pdf, "擁壁 標準断面配筋図", "S-02", "1/20・1/10")
    v = View(115, 248, 20)      # x=0 外面, y=±0
    sh.T(20, 278, "擁壁 標準断面配筋図（A-A 全周共通）   S=1/20", h=5.0, bold=True)
    # 地盤
    sh.L([v(-1500, -1670), v(-1255, -1670)], lw=0.4)
    sh.L([v(-1255, -1670), v(-1000, FRONT), v(-FK_T, FRONT)], lw=0.5)
    sh.L([v(-1255, -1670), v(-FK_T, -1670)], lw=0.25, ls=(0, (3, 1.5)), c="#8b4513")
    soil_hatch(sh, v, -1450, -1250, -1670)
    soil_hatch(sh, v, -950, -FK_T - 40, FRONT)
    sh.poly(v.P([(-FK_T, F_BOT), (0, F_BOT), (0, FRONT), (-FK_T, FRONT)]), fc="#d0d0d0", ec="k", lw=0.4, hatch="xxx", z=2)
    sh.leader([v(-700, FRONT), v(-1100, -1880), v(-1450, -1880)], "", h=2.0, c="#b00000", dot=False)
    sh.T(*v(-1450, -1860), "前面地盤 嵩上げ ±0-1500（盛土転圧）", h=2.0, c="#b00000")
    sh.T(*v(-1450, -1740), "既存地盤 -1660～-1680", h=1.8, c="#8b4513")
    sh.leader([v(-150, -1750), v(-700, -2080), v(-1450, -2080)], "前面ふかしコン W300（無筋 Fc18）\n底盤下端～±0-1500、擁壁と一体打設可", h=1.9, c="#b00000")
    sh.dim(v(-480, F_BOT), v(-480, FRONT), 0, None)
    p = v(-500, -1720); sh.T(p[0], p[1], "根入れ400", h=2.0, ha="right", c="#b00000")
    sh.T(*v(-1000, FRONT + 60), "1,000以上 平坦", h=1.7, c="#555")
    sh.L([v(T_WALL, 0), v(3600, 0)], lw=0.4)
    soil_hatch(sh, v, 650, 3550, 0)
    sh.T(*v(2600, 60), "▽ 設計GL ±0（敷地側）", h=2.3)
    # 砕石・捨てコン
    sh.poly(v.P([(-FK_T, F_BOT - 150), (3100, F_BOT - 150), (3100, F_BOT - 50), (-FK_T, F_BOT - 50)]), fc="#f6f6f6", hatch="..", lw=0.2)
    sh.poly(v.P([(-FK_T, F_BOT - 50), (3100, F_BOT - 50), (3100, F_BOT), (-FK_T, F_BOT)]), fc="#d9d9d9", lw=0.25)
    # 躯体
    body = [(0, F_BOT), (B_FOOT, F_BOT), (B_FOOT, F_TOP), (T_WALL, F_TOP), (T_WALL, H_TOP), (0, H_TOP)]
    sh.poly(v.P(body), fc="#f3f3f3", ec="k", lw=0.6, z=2)
    # 面木（天端両角 20）
    m = 20
    for (x, sx) in [(0, 1), (T_WALL, -1)]:
        sh.poly(v.P([(x, H_TOP), (x + sx * m, H_TOP), (x, H_TOP - m)]), fc="white", ec="k", lw=0.3, z=3)
    # 裏込砕石・止水コン
    gravel(sh, v, T_WALL, -1100, T_WALL + 300, -300)
    # 【VE・改3-2】ガラ割栗の水はけ層（裏込め砕石の外側 W500、透水シートを挟む）
    VE_W = 500
    sh.poly(v.P([(T_WALL + 300, -1100), (T_WALL + 300 + VE_W, -1100), (T_WALL + 300 + VE_W, -300), (T_WALL + 300, -300)]),
            fc="#fff2cc", ec="#c07000", lw=0.4, ls=(0, (3, 1.5)), z=1)
    rng_ = np.random.default_rng(7)
    for _ in range(26):
        cx_ = rng_.uniform(T_WALL + 340, T_WALL + 300 + VE_W - 40); cy_ = rng_.uniform(-1060, -340)
        pts_ = [(cx_ + 45 * math.cos(a_) * rng_.uniform(0.6, 1.0), cy_ + 35 * math.sin(a_) * rng_.uniform(0.6, 1.0)) for a_ in np.linspace(0, 2 * math.pi, 6)[:-1]]
        sh.poly(v.P(pts_), fc="#e6d3a8", ec="#a07020", lw=0.2, z=2)
    sh.L([v(T_WALL + 302, -1100), v(T_WALL + 302, -300)], lw=0.9, c="#2e8b57", ls=(0, (2, 1)), z=3)
    sh.leader([v(T_WALL + 300 + VE_W / 2, -480), v(1250, -400), v(1300, -400)],
              "【VE】ガラ割栗の水はけ層 W500（50～150mm）\n透水シート挟み・西／東面のみ・設計者承認後", h=2.0, c="#c07000")
    sh.poly(v.P([(T_WALL, -1150), (T_WALL + 350, -1150), (T_WALL + 350, -1100), (T_WALL, -1100)]), fc="#cfcfcf", ec="k", lw=0.3)
    # 吸出し防止材
    sh.L([v(T_WALL + 3, -1000), v(T_WALL + 3, -1100 + 8)], lw=0.8, c="#2e8b57")
    # 水抜穴
    yb, yt = WJ - 44, WJ + 44
    sh.poly(v.P([(-30, yb - 6), (T_WALL + 5, yb + 0), (T_WALL + 5, yt), (-30, yt - 6)]), fc="white", ec="#1060c0", lw=0.4, z=4)
    # ---------------- 配筋
    xo = C_WALL + D13 / 2           # 前面縦筋芯 86.5
    xi = T_WALL - C_WALL - D13 / 2  # 背面縦筋芯 163.5
    ytop = H_TOP - C_WALL
    yb_main = F_BOT + C_FOOT + D13 / 2          # 下端主筋芯
    yt_main = F_TOP - C_FOOT - D13 / 2          # 上端主筋芯
    yleg = yb_main + D13 + D13 / 2 + 1          # 縦筋脚
    xe = B_FOOT - C_FOOT - D13 / 2
    xs = C_WALL + D13 / 2
    lw = 0.55
    # 底盤主筋
    sh.L(v.P([(xs, yt_main - 300), (xs, yt_main), (xe, yt_main), (xe, yt_main - 300)]), lw=lw, c=RB, z=5)
    sh.L(v.P([(xs + 14, yb_main + 300), (xs + 14, yb_main), (xe - 14, yb_main), (xe - 14, yb_main + 300)]), lw=lw, c=RB, z=5)
    # 縦筋
    sh.L(v.P([(xo, ytop), (xo, yleg), (xo + 300, yleg)]), lw=lw, c=RB, z=5)
    sh.L(v.P([(xi, ytop), (xi, yleg + 2), (xi + 400, yleg + 2)]), lw=lw, c=RB, z=5)
    # 横筋（立上り）・配力筋（底盤）
    ys_h = [ytop - 13 - 300 * i for i in range(6)]
    ys_h[-1] = F_TOP + 70
    for y in ys_h:
        bar_dot(sh, v(xo + 13, y), v=v); bar_dot(sh, v(xi - 13, y), v=v)
    xs_d = np.linspace(xs + 120, xe - 20, 10)
    for x in xs_d:
        bar_dot(sh, v(x, yt_main - 13), v=v); bar_dot(sh, v(x, yb_main + 13), v=v)
    # 巾止め
    for y in [ys_h[1], ys_h[4]]:
        sh.L(v.P([(xo - 8, y + 18), (xo + 13, y), (xi - 13, y), (xi + 8, y - 18)]), lw=0.35, c="#a05000", z=6)
    # 寸法
    sh.dim(v(0, H_TOP), v(T_WALL, H_TOP), 9, "250")
    sh.dim(v(T_WALL, H_TOP), v(B_FOOT, H_TOP), 9, "2,750")
    sh.dim(v(0, F_BOT - 150), v(B_FOOT, F_BOT - 150), -10, "3,000", flip=True)
    sh.dim(v(B_FOOT, F_BOT - 150), v(3100, F_BOT - 150), -10, "100", flip=True, h=1.8)
    xd = 3500
    for (y1, y2, t) in [(F_BOT, F_TOP, "500"), (F_TOP, -1100, "300"), (-1100, -300, "800"), (-300, GL, "300"), (GL, H_TOP, "200")]:
        sh.dim(v(xd, y1), v(xd, y2), 0, t, h=1.9)
    sh.dim(v(xd + 220, F_BOT), v(xd + 220, H_TOP), 0, "2,100", h=2.1)
    # レベル表示
    def lvl(y, s, x=-650):
        p = v(x, y)
        sh.L([p + np.array([0, 0]), p + np.array([14, 0])], lw=0.15, c=DIMC)
        sh.poly([p + np.array([1.3, 0]), p + np.array([2.6, 1.6]), p + np.array([0, 1.6])], fc=DIMC, ec=DIMC, lw=0.1)
        sh.T(p[0] + 3.2, p[1] + 0.5, s, h=2.0, c=DIMC)
    lvl(H_TOP, "天端 ±0+200", -800)
    lvl(F_TOP, "底盤天 ±0-1400", -800)
    lvl(F_BOT, "底盤下 ±0-1900", -800)
    lvl(WJ, "水抜穴芯 ±0-1060", -800)
    # 引出し
    sh.leader([v(xi, -400), v(1250, -180), v(1300, -180)], "W1 縦筋（背面・主筋）D13@300\n  底盤内 L形 脚400", h=2.2, c=RB)
    sh.leader([v(xo, -300), v(-300, 450), v(-1300, 450)], "W2 縦筋（前面）D13@300\n  底盤内 L形 脚300", h=2.2, c=RB, ha="left")
    sh.leader([v(xo + 13, ys_h[2]), v(-500, -180), v(-1450, -180)], "W3 横筋 D13@300 両面 各6段", h=2.2, c=RB)
    sh.leader([v(xi - 13 - 30, ys_h[4]), v(-450, -880), v(-1450, -880)], "W4 巾止め筋 D10@1000×1000", h=2.2, c="#a05000")
    sh.leader([v(1600, yt_main), v(1250, -1300), v(1300, -1300)], "F1 底盤上端主筋 D13@300（コ形）", h=2.2, c=RB)
    sh.leader([v(2100, yb_main), v(1650, -2480), v(1700, -2480)], "F2 底盤下端主筋 D13@300（コ形）", h=2.2, c=RB)
    sh.leader([v(xs_d[6], yt_main - 13), v(1950, -1150), v(2000, -1150)], "F3 配力筋 D13@300 上下各10本", h=2.2, c=RB)
    sh.leader([v(400, -600), v(1250, -540), v(1300, -540)], "裏込砕石 W300（RC-40／単粒度）\n天端±0-300～-1100", h=2.2)
    sh.leader([v(560, -1125), v(1250, -1000), v(1300, -1000)], "止水コンクリート W350 t=50", h=2.2)
    sh.leader([v(T_WALL + 3, -1050), v(1250, -800), v(1300, -800)], "吸出し防止材（透水マット）", h=2.0, c="#2e8b57")
    sh.leader([v(60, WJ), v(-400, -1250), v(-1450, -1250)], "水抜穴 VP75 外向き勾配2%以上\n管底＝止水コン天端", h=2.2, c="#1060c0")
    sh.leader([v(10, H_TOP - 8), v(-200, 330), v(-650, 330)], "面木 20×20（天端両角）", h=2.2)
    sh.T(*v(-1450, -2330), "均しコン t=50 ／ 基礎砕石 t=100（ふかしコン下まで、敷地側100出し）", h=2.0)
    sh.T(*v(-1450, -2480), "底盤下：設計地耐力 80kN/m² 確保（柱状改良・地盤置換は別途）", h=2.0)

    # 部分詳細 1/5 : 天端面木・目地棒・水抜穴
    # 天端詳細
    v5 = View(330, 240, 10)
    sh.T(305, 278, "部分詳細   S=1/10", h=4.0, bold=True)
    sh.T(305, 270, "① 天端（面木）", h=2.6, bold=True)
    sh.poly(v5.P([(0, -250), (250, -250), (250, -20), (230, 0), (20, 0), (0, -20)]), fc="#f3f3f3", lw=0.5)
    sh.dim(v5(0, 0), v5(250, 0), 6, "250")
    for x, sgn in [(0, 1), (250, -1)]:
        sh.poly(v5.P([(x, 0), (x + sgn * 20, 0), (x, -20)]), fc="#e8d8b0", ec="#8a6a20", lw=0.3)
    sh.leader([v5(10, -6), v5(-60, 30), v5(-130, 30)], "面木20", h=2.0)
    sh.dim(v5(250, -20), v5(250, 0), 4, "20", h=1.7)
    sh.T(*v5(20, -150), "天端 金ゴテ押え", h=2.0)
    sh.T(*v5(20, -200), "（両角 C20）", h=2.0)
    # 誘発目地平面
    v5b = View(357, 170, 10)
    sh.T(305, 205, "② 誘発目地 CJ（平面）", h=2.6, bold=True)
    sh.poly(v5b.P([(-450, 0), (-15, 0), (-10, 25), (10, 25), (15, 0), (450, 0), (450, 250), (15, 250), (10, 225), (-10, 225), (-15, 250), (-450, 250)]),
            fc="#f3f3f3", lw=0.5)
    for yy_ in (86.5, 163.5):
        sh.L([v5b(-450, yy_), v5b(450, yy_)], lw=0.35, c=RB)
    sh.L([v5b(0, 25), v5b(0, 225)], lw=0.15, ls=(0, (2, 1)), c="k")
    sh.leader([v5b(0, 5), v5b(-60, -50), v5b(-450, -50)], "目地棒（台形 30/20×D25）両面／外面シーリング", h=1.9)
    sh.dim(v5b(-15, 250), v5b(15, 250), 4, "30", h=1.7)
    sh.dim(v5b(-450, 0), v5b(-450, 25), -3, "25", h=1.7)
    sh.T(*v5b(-450, -120), "断面欠損 50/250＝20%  横筋は連続", h=1.9)
    sh.T(*v5b(-450, -160), "範囲：天端～底盤天（立上り部のみ）", h=1.9)
    # 水抜穴
    v5c = View(340, 100, 10)
    sh.T(305, 140, "③ 水抜穴（断面）", h=2.6, bold=True)
    sh.poly(v5c.P([(0, -200), (250, -200), (250, 250), (0, 250)]), fc="#f3f3f3", lw=0.5)
    gravel(sh, v5c, 250, -40, 450, 250, seed=3)
    sh.poly(v5c.P([(250, -90), (520, -90), (520, -40), (250, -40)]), fc="#cfcfcf", lw=0.3)
    sh.poly(v5c.P([(-40, -46), (253, -40), (253, 49), (-40, 43)]), fc="white", ec="#1060c0", lw=0.5, z=4)
    sh.L([v5c(253, -40), v5c(253, 160)], lw=0.9, c="#2e8b57")
    sh.leader([v5c(100, 0), v5c(60, 140), v5c(-40, 140)], "VP75（内径75）", h=1.9, ha="right", c="#1060c0")
    sh.leader([v5c(253, 120), v5c(330, 300), v5c(400, 300)], "吸出し防止材 300×300", h=1.9, c="#2e8b57")
    sh.leader([v5c(450, -65), v5c(520, -150), v5c(560, -150)], "止水コン t=50", h=1.9)
    sh.T(*v5c(-60, -170), "外部へ勾配2%以上", h=1.9)
    sh.T(*v5c(-60, -230), "管端は外面面一", h=1.9)

    # 設計条件・特記
    lines = [
        "設計地耐力 80kN/m²  地表面積載荷重 10kN/m²",
        "コンクリート Fc=21N/mm²（呼び強度は構造体補正 mSn を加算）",
        "鉄筋 SD295  かぶり厚さ：壁 80 ／ 底盤 100（全面）",
        "重ね継手 40d（D13＝520）千鳥継手  定着 35d（フック付 25d）",
        "スペーサー：壁 80用 縦横@1,000以内／底盤 サイコロ100 @1,000以内",
        "打継ぎ：底盤天で水平打継ぎ。レイタンス除去・目荒らし後に立上り打設。",
        "縦筋は先組し底盤と同時に固定、打設時に移動させないこと。",
        "縦筋は前面・背面とも 外側、横筋は内側に配筋（有効せい確保）。",
    ]
    sh.note_box(20, 108, 240, "設計条件・配筋特記", lines, h=2.1, lh=3.4)
    sh.save()

# ============================================================== S-03 目地・隅角・端部詳細
def sheet_details(pdf):
    sh = Sheet(pdf, "擁壁 目地・隅角部・端部詳細", "S-03", "1/10・1/20・1/30")
    sh.T(20, 278, "伸縮目地・誘発目地・隅角部・端部 詳細", h=5.0, bold=True)
    # ---------- ① 伸縮目地 平面 1/10
    v = View(80, 228, 10)
    sh.T(20, 268, "① 伸縮目地 EJ（平面） S=1/10", h=2.8, bold=True)
    for sgn in (-1, 1):
        x0, x1 = sgn * 5, sgn * 500
        sh.poly(v.P([(x0, 0), (x1, 0), (x1, 250), (x0, 250)]), fc="#f3f3f3", lw=0.5)
        for yy_ in (86.5, 163.5):
            sh.L([v(sgn * (5 + 80), yy_), v(x1, yy_)], lw=0.5, c=RB)
        for yy_ in (99.5, 150.5):
            for xx in np.arange(sgn * 110, x1, sgn * 300):
                pass
        for xx in [sgn * 92, sgn * 392]:
            bar_dot(sh, v(xx, 99.5 - 13), v=v); bar_dot(sh, v(xx, 150.5 + 13), v=v)
        for yy_ in (0, 250):
            sh.poly(v.P([(x0, yy_), (x0 + sgn * 20, yy_), (x0, yy_ + (20 if yy_ == 0 else -20))]), fc="#e8d8b0", ec="#8a6a20", lw=0.2)
    sh.poly(v.P([(-5, 0), (5, 0), (5, 250), (-5, 250)]), fc="#7a5a2a", lw=0.2)
    sh.poly(v.P([(-5, -10), (5, -10), (5, 0), (-5, 0)]), fc="#333", lw=0.2)
    sh.leader([v(0, 200), v(150, 300), v(300, 300)], "目地材 エラスタイト t=10\n（全断面：立上り＋底盤）", h=2.0)
    sh.leader([v(0, -6), v(150, -150), v(300, -150)], "外面 シーリング 10×10", h=2.0)
    sh.leader([v(-20, 3), v(-250, -150), v(-450, -150)], "面木20（目地両側）", h=2.0)
    sh.dim(v(-500, 0), v(-500, 250), 4, "250", h=1.8)
    sh.dim(v(5, 163.5), v(85, 163.5), 0, None)
    sh.T(*v(-560, 10), "外面", h=2.0, ha="right")
    sh.T(*v(-560, 220), "内面", h=2.0, ha="right")
    yy = 205
    for s in ["・鉄筋は目地で切断（目地面かぶり 壁80／底盤100）",
              "・底盤も同位置で縁切り。妻型枠を立て片側ずつ打設",
              "・天端・外面の目地際は面木20で面取り",
              "・位置：北面 NW隅から 5,300 ／ 20,400（S-01）",
              f"・改3：NW隅＝新西面と北面の交点（境界NW角から東へ{SHIFT_W*1000:,.0f}）"]:
        sh.T(22, yy, s, h=2.0); yy -= 3.4

    # ---------- ② 誘発目地 立面 1/30
    vv = View(212, 225, 30)
    sh.T(165, 245, "② 誘発目地 CJ（立面・外面） S=1/30", h=2.8, bold=True)
    sh.poly(vv.P([(-900, F_BOT), (900, F_BOT), (900, H_TOP), (-900, H_TOP)]), fc="#f6f6f6", lw=0.5)
    sh.L([vv(-900, F_TOP), vv(900, F_TOP)], lw=0.2, ls=(0, (3, 1.5)))
    sh.poly(vv.P([(-15, F_TOP), (15, F_TOP), (15, H_TOP), (-15, H_TOP)]), fc="#e8d8b0", ec="#8a6a20", lw=0.3)
    sh.leader([vv(0, -500), vv(400, -300), vv(700, -300)], "目地棒", h=2.0)
    sh.dim(vv(900, F_TOP), vv(900, H_TOP), -5, "1,600", h=1.8)
    sh.dim(vv(900, F_BOT), vv(900, F_TOP), -5, "500", h=1.8)
    sh.T(*vv(-880, F_TOP + 60), "底盤天", h=1.8)
    yy = 152
    for s in ["・目地棒 台形 30/20×D25（木製又は樹脂製）",
              "  立上り 両面、天端～底盤天まで通す",
              "・天端は目地位置で V カット 10",
              "・断面欠損 50/250＝20％、横筋は連続",
              "・外面側目地にシーリング 10×10",
              "・底盤部は連続（目地を設けない）"]:
        sh.T(165, yy, s, h=2.0); yy -= 3.4

    # ---------- ⑤ 端部 平面 1/20
    ve = View(385, 238, 20)
    sh.T(290, 268, "⑤ 壁端部（平面） S=1/20", h=2.8, bold=True)
    sh.poly(ve.P([(-1500, 0), (0, 0), (0, 250), (-1500, 250)]), fc="#f3f3f3", lw=0.5)
    sh.L([ve(-1500, 99.5), ve(-120, 99.5)], lw=0.5, c=RB)
    sh.L([ve(-1500, 150.5), ve(-120, 150.5)], lw=0.5, c=RB)
    sh.L([ve(-640, 99.5 + 6), ve(-100, 99.5 + 6), ve(-100, 150.5 - 6), ve(-640, 150.5 - 6)], lw=0.5, c="#7030a0")
    for x_ in (-86.5, -386.5, -686.5, -986.5, -1286.5):
        bar_dot(sh, ve(x_, 86.5), v=ve); bar_dot(sh, ve(x_, 163.5), v=ve)
    sh.leader([ve(-500, 125), ve(-700, 450), ve(-1500, 450)], "E1 端部コ字筋 D13 各横筋段 脚520", h=2.0, c="#7030a0")
    sh.leader([ve(-86.5, 86.5), ve(-200, -350), ve(-1500, -350)], "E2 端部縦筋 追加 2-D13（前後各1）", h=2.0, c=RB)
    for yy_ in (0, 250):
        sh.poly(ve.P([(0, yy_), (-20, yy_), (0, yy_ + (20 if yy_ == 0 else -20))]), fc="#e8d8b0", ec="#8a6a20", lw=0.2)
    yy = 214
    for s in ["・西面端部：道路境界線に沿って止め",
              "・東面端部：壁に直角に止め",
              "・端部の鉛直出隅は面木20",
              "・底盤端部は配力筋を90°フック（余長300）"]:
        sh.T(292, yy, s, h=2.0); yy -= 3.4

    # ---------- ③④ 隅角部 平面 1/30
    def corner_detail(ox, oy, idx, title):
        sh.T(ox - 30 if idx == 1 else ox - 75, oy + 12, title, h=2.8, bold=True)
        c_out = OUTER[idx] * 1000; ci = INNER_W[idx] * 1000
        a = unit(OUTER[idx - 1] - OUTER[idx]); b = unit(OUTER[idx + 1] - OUTER[idx])
        def inw(d):
            n = np.array([-d[1], d[0]])
            return n if np.dot(n, ci - c_out) > 0 else -n
        nA, nB = inw(a), inw(b)
        vc = View(ox, oy, 30)
        T_ = lambda p: vc(p - c_out)
        Lg = 1900
        h1, h2 = ci + a * 500, ci + b * 500
        wall = [c_out + a * Lg, c_out, c_out + b * Lg, c_out + b * Lg + nB * 250, h2, h1, c_out + a * Lg + nA * 250]
        sh.poly([T_(p) for p in wall], fc="#e9e9e9", ec="k", lw=0.5)
        sh.L([T_(h1), T_(ci), T_(h2)], lw=0.15, ls=(0, (2, 1)))
        # 底盤内側線（参考）
        fi = INNER_F[idx] * 1000
        # 外側横筋（曲げ連続）
        Ao, Bo = c_out + nA * 99.5, c_out + nB * 99.5
        co = line_int(Ao, a, Bo, b)
        sh.L([T_(Ao + a * Lg), T_(co), T_(Bo + b * Lg)], lw=0.6, c=RB, z=6)
        # 内側横筋 → 相手壁外側筋まで延長し 520 定着
        Ai, Bi = c_out + nA * 150.5, c_out + nB * 150.5
        pA = line_int(Ai, a, Bo, b); pB = line_int(Bi, b, Ao, a)
        sh.L([T_(Ai + a * Lg), T_(pA), T_(pA + b * 520)], lw=0.6, c=RB, z=6)
        sh.L([T_(Bi + b * Lg), T_(pB), T_(pB + a * 520)], lw=0.6, c="#e07070", z=6)
        # 縦筋
        for t in np.arange(300, Lg, 300):
            for base, d, n in [(c_out, a, nA), (c_out, b, nB)]:
                bar_dot(sh, T_(base + d * t + n * 86.5), v=vc); bar_dot(sh, T_(base + d * t + n * 163.5), v=vc)
        # ハンチ斜め補強筋
        hd = unit(h2 - h1); hn = np.array([-hd[1], hd[0]])
        if np.dot(hn, c_out - h1) < 0:
            hn = -hn
        m1 = h1 + hn * 60
        l1 = line_int(m1, hd, Ai, a); l2 = line_int(m1, hd, Bi, b)
        sh.L([T_(l1 + a * 520), T_(l1), T_(l2), T_(l2 + b * 520)], lw=0.6, c="#7030a0", z=7)
        cen = (ci + h1 + h2) / 3
        hv = [cen + (ci - cen) * 0.0, (h1 + cen) / 2 + hn * 0, (h2 + cen) / 2]
        for p in [cen, cen + (h1 - cen) * 0.45, cen + (h2 - cen) * 0.45]:
            q = T_(p); sh.circ(q[0], q[1], 0.6, fc="#7030a0", ec="#7030a0", z=8)
        # 寸法
        sh.dim(T_(ci), T_(h1), 0, None)
        q = T_((ci + h1) / 2); sh.T(q[0], q[1], "500", h=1.8, ha="center", va="center", c=DIMC, bg=True)
        q = T_((ci + h2) / 2); sh.T(q[0], q[1], "500", h=1.8, ha="center", va="center", c=DIMC, bg=True)
        sh.dim(T_(c_out + a * Lg), T_(c_out + a * Lg + nA * 250), 0, None)
        q = T_(c_out + a * Lg + nA * 125 + a * 120); sh.T(q[0], q[1], "250", h=1.8, ha="center", va="center", c=DIMC, bg=True)
        return T_, l1, l2, cen, c_out, a, b

    T_, l1, l2, cen, co, a, b = corner_detail(50, 170, 1, f"③ NW隅角部（平面） S=1/30   内角 約{ANG_NW:.1f}°")
    m = T_((l1 + l2) / 2)
    sh.leader([m, m + np.array([45, -10]), m + np.array([60, -10])], "C1a ハンチ斜め補強筋 D13\n各横筋段（6段）脚520", h=2.0, c="#7030a0")
    q = T_(cen)
    sh.leader([q, q + np.array([45, 4]), q + np.array([60, 4])], "C2 ハンチ縦補強筋 3-D13", h=2.0, c="#7030a0")
    q = T_(co); sh.T(q[0] + 20, q[1] + 3, "隣地側（外面）", h=2.0)
    T2, l1b, l2b, cen2, co2, a2, b2 = corner_detail(395, 170, 2, f"④ NE隅角部（平面） S=1/30   内角 約{ANG_NE:.1f}°")
    m = T2((l1b + l2b) / 2)
    sh.leader([m, m + np.array([-25, -30]), m + np.array([-62, -30])], "C1b ハンチ斜め補強筋 D13\n各横筋段（6段）脚520", h=2.0, c="#7030a0", ha="left")
    q = T2(cen2)
    sh.leader([q, q + np.array([-25, -42]), q + np.array([-62, -42])], "C2 ハンチ縦補強筋 3-D13", h=2.0, c="#7030a0")
    yy = 96
    for s in ["【隅角部 共通】",
              "・外面側横筋：隅角部で折曲げ連続（継手を設けない。やむを得ない場合は重ね520）",
              "・内面側横筋：相手壁の外面側横筋位置まで延ばし、折曲げて 520 定着（C3）",
              "・ハンチ：二等辺三角形 500×500（宅地防災マニュアル H≦3m）、天端～底盤天まで全高",
              "・底盤：隅角部は両方向の主筋・配力筋を重ねて配置し一体打設",
              "・伸縮目地・誘発目地は隅角部から2m以上離す（S-01割付済）",
              "・NE隅は鋭角（約69°）：出隅に面木20、鋭角部のかぶり80を必ず確保"]:
        sh.T(22, yy, s, h=2.1); yy -= 3.6
    sh.save()

# ============================================================== S-04 展開図
def sheet_elev(pdf):
    sh = Sheet(pdf, "擁壁 展開図", "S-04", "1/60")
    sh.T(20, 278, "擁壁 展開図（敷地内側より見る）  S=1/60   ※水抜穴は外面まで貫通", h=5.0, bold=True)
    # 連続展開位置 s: 西面南端=0 → NW → NE → 東面南端
    S_NW = L_W; S_NE = L_W + L_N; S_END = L_W + L_N + L_E
    def to_s(w, d):
        return {"W": L_W - d, "N": L_W + d, "E": L_W + L_N + d}[w]
    split = to_s("N", 12.850)
    rows = [(0.0, split, 236), (split, S_END, 145)]
    for r, (s0, s1, oy) in enumerate(rows):
        v = View(22 - s0 * 1000 / 60, oy, 60)
        X = lambda s: v(s * 1000, 0)[0]
        # 躯体
        sh.poly([v(s0 * 1000, F_BOT), v(s1 * 1000, F_BOT), v(s1 * 1000, H_TOP), v(s0 * 1000, H_TOP)], fc="#f4f4f4", lw=0.5)
        sh.L([v(s0 * 1000, F_TOP), v(s1 * 1000, F_TOP)], lw=0.25)
        sh.L([v(s0 * 1000, GL), v(s1 * 1000, GL)], lw=0.15, ls=(0, (6, 2)), c="#666")
        # 外部地盤（参考）
        ss = np.linspace(s0, s1, 200)
        gp = []
        for s in ss:
            if s <= S_NW:
                g = ext_ground("W", S_NW - s)
            elif s <= S_NE:
                g = ext_ground("N", s - S_NW)
            else:
                g = ext_ground("E", s - S_NE)
            gp.append(v(s * 1000, g))
        sh.L(gp, lw=0.35, ls=(0, (3, 1.5)), c="#8b4513")
        # 隅角・端部
        for s, lab in [(0, "西面 南端"), (S_NW, "NW隅角"), (S_NE, "NE隅角"), (S_END, "東面 南端")]:
            if s0 - 1e-6 <= s <= s1 + 1e-6:
                sh.L([v(s * 1000, F_BOT - 150), v(s * 1000, H_TOP + 300)], lw=0.5, ls=(0, (8, 2, 1, 2)))
                p = v(s * 1000, H_TOP + 350)
                sh.T(p[0], p[1] + 5, lab, h=2.3, ha="center", bold=True)
        # 面ラベル
        ga, gb = sorted((to_s("W", GAP_T0), to_s("W", GAP_T1)))
        if gb > s0 and ga < s1:
            a2, b2 = max(ga, s0), min(gb, s1)
            sh.poly([v(a2 * 1000, F_BOT - 400), v(b2 * 1000, F_BOT - 400), v(b2 * 1000, F_BOT), v(a2 * 1000, F_BOT)],
                    fc="#fde3e8", ec="#c00030", lw=0.3, hatch="\\\\\\", z=2)
            p = v((a2 + b2) / 2 * 1000, F_BOT - 400); sh.T(p[0], p[1] - 3.2, "無改良区間（電線下）→ S-07", h=1.9, ha="center", c="#c00030")
        ps = to_s("W", POLE_S_W)
        if s0 <= ps <= s1:
            sh.L([v(ps * 1000, H_TOP + 150), v(ps * 1000, H_TOP + 1500)], lw=0.8, c=POLE_C, ls=(0, (3, 1.5)))
            p = v(ps * 1000, H_TOP + 1550)
            sh.T(p[0], p[1], f"電柱（壁外側 約{POLE_TO_WALL:.1f}m・推定）", h=2.0, ha="center", c=POLE_C)
        for a_, b_, lab in [(0, S_NW, f"西面  L={L_W*1000:,.0f}"), (S_NW, S_NE, f"北面  L={L_N*1000:,.0f}"), (S_NE, S_END, f"東面  L={L_E*1000:,.0f}")]:
            a2, b2 = max(a_, s0), min(b_, s1)
            if b2 - a2 > 0.5:
                p = v((a2 + b2) / 2 * 1000, H_TOP + 350)
                sh.T(p[0], p[1] + 1, lab, h=2.6, ha="center", c="#333")
        # 目地
        marks = []
        for d in EJ_N:
            marks.append((to_s("N", d), "EJ"))
        for d in CJ_N:
            marks.append((to_s("N", d), "CJ"))
        for d in CJ_W:
            marks.append((to_s("W", d), "CJ"))
        for d in CJ_E:
            marks.append((to_s("E", d), "CJ"))
        for s, t in marks:
            if s0 - 1e-6 <= s <= s1 + 1e-6:
                if t == "EJ":
                    sh.L([v(s * 1000, F_BOT), v(s * 1000, H_TOP)], lw=1.0, c="#d06000", z=6)
                    p = v(s * 1000, F_BOT); sh.T(p[0], p[1] - 4, "EJ", h=2.2, ha="center", c="#d06000", bold=True)
                else:
                    sh.L([v(s * 1000, F_TOP), v(s * 1000, H_TOP)], lw=0.6, c="#007a3d", z=6)
                    p = v(s * 1000, F_BOT); sh.T(p[0], p[1] - 4, "CJ", h=2.0, ha="center", c="#007a3d", bold=True)
        # ハンチ
        for s in (S_NW, S_NE):
            if s0 < s < s1:
                sh.poly([v(s * 1000 - 500, F_TOP), v(s * 1000 + 500, F_TOP), v(s * 1000 + 500, H_TOP), v(s * 1000 - 500, H_TOP)],
                        fc="none", ec="#7030a0", lw=0.3, ls=(0, (2, 1)))
        # 水抜穴
        for w in "WNE":
            for d, g, lv, z in WEEP[w]:
                s = to_s(w, d)
                if lv is None or not (s0 <= s <= s1):
                    continue
                p = v(s * 1000, lv)
                sh.circ(p[0], p[1], 37.5 / 60 * 1.6, fc="#1060c0" if z == "A" else "white", ec="#1060c0", lw=0.35, z=7)
        # 寸法（目地・隅角）
        keys = sorted(set([s0, s1] + [s for s, _ in marks if s0 <= s <= s1] + [s for s in (S_NW, S_NE) if s0 <= s <= s1]))
        for i in range(len(keys) - 1):
            sh.dim(v(keys[i] * 1000, F_BOT), v(keys[i + 1] * 1000, F_BOT), -9, f"{(keys[i+1]-keys[i])*1000:,.0f}", h=1.9, flip=True)
        # 高さ寸法
        if r == 0:
            sh.dim(v(s0 * 1000, F_BOT), v(s0 * 1000, F_TOP), 4, "500", h=1.8)
            sh.dim(v(s0 * 1000, F_TOP), v(s0 * 1000, H_TOP), 4, "1,600", h=1.8)
            for y, t in [(H_TOP, "天端 +200"), (GL, "±0"), (F_TOP, "-1400"), (F_BOT, "-1900")]:
                p = v(s0 * 1000, y); sh.T(p[0] - 10.5, p[1] - 0.7, t, h=1.8, ha="right" if False else "left", c=DIMC)
        if r == 0:
            p = v(s1 * 1000, H_TOP); sh.T(p[0] - 1, p[1] + 1.5, "マッチライン（下段へ続く）", h=2.0, ha="right")
        else:
            p = v(s0 * 1000, H_TOP); sh.T(p[0] + 1, p[1] + 1.5, "マッチライン（上段より）", h=2.0)
    # 凡例と注記
    y = 91
    sh.T(20, y, "凡例・注記", h=3.0, bold=True)
    items = [
        ("EJ", "#d06000", "伸縮目地：底盤まで全断面縁切り（エラスタイト t=10＋外面シーリング）"),
        ("CJ", "#007a3d", "誘発目地：立上り両面 目地棒 30/20×D25（天端～底盤天）"),
        ("●", "#1060c0", "水抜穴 VP75 標準高さ ±0-1060（管底＝止水コン天端）"),
        ("○", "#1060c0", "水抜穴 調整高さ＝外部地盤+150（止水コンも同高さに上げる）"),
        ("- -", "#8b4513", "外部地盤（嵩上げ後）：北 -1500（既存-1660～-1680を嵩上げ）／西（帯状部・仮定）NW隅1.5mまで-1500→南端-210／東 -1110→-130"),
        ("□", "#7030a0", "隅角部ハンチ 500×500 範囲"),
    ]
    for i, (m, c, t) in enumerate(items):
        sh.T(24, y - 6 - i * 4.3, m, h=2.4, c=c, bold=True)
        sh.T(36, y - 6 - i * 4.3, t, h=2.2)
    lines = [
        "・天端は ±0+200 で水平（各点の現況GL：A-1/B-1 +57, B-3 +60, B-4 +50, B-5 +100, C-1 ±0, D-1 +25）。",
        "・底盤下端 ±0-1900 で水平。BMは配置図 ±0 とし、着工前にレベル確認。",
        "・型枠：北面・東面の外面は境界線上。外部側作業スペースは隣地・道路管理者と事前協議。",
        f"・西面は境界から{OFF_W*1000:,.0f}内側（改3）。外面側の帯状部に電柱あり：電柱周囲1.0mは掘削・盛土・資材仮置き禁止（S-06）。",
        "・型枠締付け：セパレーター＋Pコン（外面はPコン穴モルタル充填）。",
        "・水抜穴は型枠に VP75 を仕込み、外部へ 2% 以上の下り勾配で固定。",
    ]
    yy = y - 6 - len(items) * 4.3 - 3
    for t in lines:
        sh.T(24, yy, t, h=2.1); yy -= 3.6
    sh.save()

# ============================================================== S-05 加工帳・数量
def bar_counts():
    runs = {"W": L_W, "N1": EJ_N[0], "N2": EJ_N[1] - EJ_N[0], "N3": L_N - EJ_N[1], "E": L_E}
    n_perp = sum(int(math.floor((L - 0.16) / 0.3)) + 1 for L in runs.values())
    return runs, n_perp

def sheet_bars(pdf):
    sh = Sheet(pdf, "擁壁 鉄筋加工帳・数量表", "S-05", "—")
    sh.T(20, 278, "鉄筋加工帳（D13・D10 SD295／D19 SD345）", h=5.0, bold=True)
    runs, n_perp = bar_counts()
    segs = [L_W + EJ_N[0], EJ_N[1] - EJ_N[0], (L_N - EJ_N[1]) + L_E]   # 伸縮目地間の連続区間
    def long_bar(nrows):
        tot, nlap = 0.0, 0
        for Ls in segs:
            Ln = Ls - 0.16
            n = int(math.ceil((Ln - 0.52) / (6.0 - 0.52)))
            n = max(n, 1)
            tot += Ln + (n - 1) * 0.52 + 0.52 * 2     # 隅角定着分を含む概算
            nlap += n - 1
        return tot * nrows, nlap * nrows
    w3_len, w3_lap = long_bar(12)
    f3_len, f3_lap = long_bar(20)
    hw = 1890
    rows = []
    def add(mark, name, dia, shape, dims, unitL, n, note=""):
        w = W_BAR[dia]
        rows.append([mark, name, dia, shape, dims, f"{unitL:,.0f}", f"{n:,}", f"{unitL*n/1000:,.1f}", f"{unitL*n/1000*w:,.0f}", note])
        return unitL * n / 1000 * w
    total = 0
    total += add("W1", "壁縦筋（背面・主筋）", "D13", "L形", f"{hw}+400", hw + 400, n_perp, "@300")
    total += add("W2", "壁縦筋（前面）", "D13", "L形", f"{hw}+300", hw + 300, n_perp, "@300")
    total += add("W3", "壁横筋（両面×6段）", "D13", "直", "定尺6.0m", w3_len * 1000 / math.ceil(w3_len / 6.0), math.ceil(w3_len / 6.0), f"継手{w3_lap}箇所（40d）")
    nfix = int(math.ceil(1.6 * (L_W + L_N + L_E) / 1.0)) + 6
    total += add("W4", "巾止め筋", "D10", "S形", "90+フック", 300, nfix, "@1000×1000")
    total += add("F1", "底盤上端主筋", "D13", "コ形(下向)", "300+2787+300", 3387, n_perp, "@300")
    total += add("F2", "底盤下端主筋", "D13", "コ形(上向)", "300+2759+300", 3359, n_perp, "@300")
    total += add("F3", "底盤配力筋（上下×10本）", "D13", "直", "定尺6.0m", f3_len * 1000 / math.ceil(f3_len / 6.0), math.ceil(f3_len / 6.0), f"継手{f3_lap}箇所（40d）")
    c1a = 520 + 2 * 500 * math.sin(rad(ANG_NW) / 2) + 520
    c1b = 520 + 2 * 500 * math.sin(rad(ANG_NE) / 2) + 520
    total += add("C1a", "NW隅 ハンチ斜め筋", "D13", "折曲げ", f"520+{c1a-1040:.0f}+520", c1a, 6)
    total += add("C1b", "NE隅 ハンチ斜め筋", "D13", "折曲げ", f"520+{c1b-1040:.0f}+520", c1b, 6)
    total += add("C2", "ハンチ縦補強筋", "D13", "L形", f"{hw}+300", hw + 300, 6, "各隅3本")
    total += add("C3", "隅角 内側横筋定着", "D13", "L形", "延長+520", 520, 24, "各隅6段×2面")
    total += add("E1", "端部コ字筋（壁）", "D13", "コ形", "520+90+520", 1130, 12, "2端部×6段")
    total += add("E2", "端部縦筋 追加", "D13", "L形", f"{hw}+300", hw + 300, 4, "2端部×2本")
    # 改3-1 電線下 無改良区間 補強（S-07）
    lr = RZ_T1 * 1000 + 760
    total += add("R1", "無改良補強 天端補強筋", "D19", "L形", f"{RZ_T1*1000:,.0f}+760", lr, 2, "SD345 両面各1・継手なし")
    total += add("R2", "無改良補強 底盤下端 壁際", "D19", "L形", f"{RZ_T1*1000:,.0f}+760", lr, 3, "SD345 継手なし")
    le = (RZ_T1 - EB_T0) * 1000 + 760
    total += add("R3", "補強梁 主筋（上下各3）", "D19", "L形", f"{(RZ_T1-EB_T0)*1000:,.0f}+760", le, 6, "SD345 継手なし")
    nst = int(round((RZ_T1 - EB_T0) / 0.2)) + 1
    total += add("R4", "補強梁 あばら筋", "D13", "閉鎖形", "380×840 フック135°", 2 * (380 + 840) + 2 * 130, nst, "@200")
    nf = int(math.floor((GAP_T1 + 0.5 - (GAP_T0 - 0.5)) / 0.3)) + 1
    total += add("F1a", "底盤上端主筋 追加", "D13", "コ形(下向)", "300+2787+300", 3387, nf, "F1と交互 @150")
    total += add("F2a", "底盤下端主筋 追加", "D13", "コ形(上向)", "300+2759+300", 3359, nf, "F2と交互 @150")
    cols = [("符号", 13), ("名称", 44), ("径", 11), ("形状", 18), ("加工寸法(mm)", 36), ("1本長", 16), ("本数", 13),
            ("総長m", 16), ("重量kg", 16), ("備考", 50)]
    yb = sh.table(20, 270, cols, rows, rh=5.0, h=2.15)
    sh.T(20, yb - 5, f"鉄筋合計（概算・ロス別）  約 {total:,.0f} kg  ≒ {total/1000:.2f} t   （D13 0.995・D19 2.25・D10 0.560 kg/m）", h=2.6, bold=True)
    sh.T(20, yb - 9.5, f"※本数は壁延長を伸縮目地・隅角で区切った区間毎に @300 で算出（区間：西{runs['W']:.2f} / 北{runs['N1']:.2f}・{runs['N2']:.2f}・{runs['N3']:.2f} / 東{runs['E']:.2f} m）。現場で端数調整のこと。", h=2.0)
    sh.T(20, yb - 13, "※曲げ加工寸法は外寸。縦筋の上端は天端かぶり80で直止め。重ね継手40d(520)は千鳥配置、隅角部・目地部に継手を設けない。", h=2.0)

    # 形状図
    x0, y0 = 300, yb - 25
    y0s = y0
    x0, y0 = 300, 75
    sh.T(x0 - 8, y0 + 4, "形状略図", h=2.6, bold=True)
    def Lshape(x, y, a, b, lab):
        sh.L([(x, y + a), (x, y), (x + b, y)], lw=0.6, c=RB); sh.T(x + 2, y + a - 3, lab, h=2.0)
    Lshape(x0, y0 - 25, 20, 8, "W1/W2/C2/E2")
    sh.L([(x0 + 30, y0 - 18), (x0 + 30, y0 - 22), (x0 + 60, y0 - 22), (x0 + 60, y0 - 18)], lw=0.6, c=RB); sh.T(x0 + 32, y0 - 16, "F2", h=2.0)
    sh.L([(x0 + 30, y0 - 6), (x0 + 30, y0 - 2), (x0 + 60, y0 - 2), (x0 + 60, y0 - 6)], lw=0.6, c=RB); sh.T(x0 + 32, y0 - 10, "F1", h=2.0)
    sh.L([(x0 + 70, y0 - 2), (x0 + 90, y0 - 2), (x0 + 90, y0 - 5), (x0 + 70, y0 - 5)], lw=0.6, c="#7030a0"); sh.T(x0 + 70, y0 - 9, "E1", h=2.0)

    # 数量表
    y0 = y0s
    sh.T(20, y0 + 4, "コンクリート・型枠ほか 数量（概算）", h=3.0, bold=True)
    form = (L_OUT * 2.1 + L_INW * 1.6 + L_INF * 0.5 + 0.25 * 1.6 * 2 + 3.0 * 0.5 * 2 + 1.9 * 2 * 2)
    q = [
        ["擁壁延長（外面）", f"{L_OUT:,.2f}", "m", f"西{L_W:.2f}＋北{L_N:.2f}＋東{L_E:.2f}（改3）"],
        ["コンクリート 底盤 t=500", f"{V_FOOT:,.2f}", "m³", f"底盤面積 {A_FOOT:,.1f}m²"],
        ["コンクリート 立上り t=250（ハンチ含）", f"{V_WALL:,.2f}", "m³", "H=1,600"],
        ["コンクリート 計 Fc21", f"{V_FOOT+V_WALL:,.2f}", "m³", "ロス別"],
        ["均しコンクリート t=50", f"{A_FOOT*1.05*0.05:,.2f}", "m³", "敷地側100出し"],
        ["基礎砕石 t=100", f"{A_FOOT*1.05*0.1:,.2f}", "m³", "転圧"],
        ["型枠（外面・内面・妻）", f"{form:,.0f}", "m²", "伸縮目地妻型枠含む"],
        ["裏込砕石 300×800", f"{L_INW*0.3*0.8:,.1f}", "m³", ""],
        ["止水コンクリート 350×50", f"{L_INW*0.35*0.05:,.2f}", "m³", ""],
        ["面木 20×20", f"{L_OUT+L_INW+8:,.0f}", "m", "天端両角＋端部・出隅"],
        ["目地棒 30/20×D25（誘発目地）", f"{(len(CJ_W)+len(CJ_N)+len(CJ_E))*2*1.6:,.1f}", "m", f"{len(CJ_W)+len(CJ_N)+len(CJ_E)}箇所×両面"],
        ["エラスタイト t=10（伸縮目地）", f"{len(EJ_N)*1.9:,.1f}", "m²", f"{len(EJ_N)}箇所"],
        ["シーリング 10×10", f"{len(EJ_N)*(2.1+0.25)+(len(CJ_W)+len(CJ_N)+len(CJ_E))*1.6:,.1f}", "m", "外面・天端"],
        ["前面ふかしコン W300（無筋 Fc18）", f"{0.3*0.4*(L_N+FK_W+0.3):,.2f}", "m³", f"北面全長＋西面{FK_W:.1f}m"],
        ["前面嵩上げ盛土（転圧）", f"{0.17*1.2*(L_N+FK_W):,.1f}", "m³", "平均17cm×幅約1.2m 概算"],
        ["水抜穴 VP75 L=300", f"{sum(1 for w in WEEP for x in WEEP[w] if x[2])}", "箇所", "吸出し防止材共"],
        ["補強梁（上がり梁）コンクリート Fc21", f"{EB_B*(EB_D-0.5)*(RZ_T1-EB_T0):,.2f}", "m³", f"{EB_B*1000:.0f}×{(EB_D-0.5)*1000:.0f} L={RZ_T1-EB_T0:.1f}m（S-07）"],
        ["補強梁 型枠", f"{2*(EB_D-0.5)*(RZ_T1-EB_T0)+EB_B*(EB_D-0.5):,.1f}", "m²", "両側面＋妻"],
        ["【VE】ガラ割栗の水はけ層 W500×H800", "約16", "m³", "西・東面。透水シート共（承認後）"],
    ]
    sh.table(20, y0, [("項目", 70), ("数量", 22), ("単位", 12), ("備考", 50)], q, rh=4.5, h=2.1)
    chk = [
        "1. 根入れ：躯体は構造計算どおり（底盤下端 ±0-1900）。北面・西面NW側の",
        "   前面地盤を ±0-1500 に嵩上げ＋前面ふかしコン W300 で根入れ400を確保。",
        "   見え高さ 1,700（2m以下）。嵩上げ部は外面から1.0m以上平坦、転圧管理。",
        "2. 天端 ±0+200 水平の可否（現況GL ±0～+100、天端の見え高さが変わる）。",
        f"3. 西面は境界から{OFF_W*1000:,.0f}内側（北面{SHIFT_W*1000:,.0f}短縮）。電柱・支柱の位置を実測し",
        f"   新西面まで1.0m以上（推定 表面で{(POLE_TO_WALL-POLE_R)*1000:,.0f}）を確認。九電と事前協議（S-06）。",
        "   帯状部（旧西面位置～新西面）の仕上げ高さ・排水・土留めを決定。",
        "4. 外部地盤高さを実測し、水抜穴の高さ（標準／調整／省略）を確定。",
        "5. 申請建物基礎と北面底盤（ヒール）の重なり・取合い高さ。",
        "6. 外面型枠・足場の作業スペース（隣地承諾・道路使用）。",
        "7. 東面（道路側）は既存地盤で根入れ790以上のため嵩上げ不要。",
        "   上空線（電線）の高さを実測、重機・ポンプ車の作業高さを制限（S-06）。",
        "8. 数量・本数は概算。鉄筋業者にて加工帳を最終チェックのこと。",
        f"9. 電線下の無改良区間（西面 NW隅から{GAP_T0:.1f}～{GAP_T1:.1f}m）：打設できない改良体の",
        "   範囲を改良業者と確定し、端部の改良体の再計算・増し打ちを依頼（S-07）。",
        "   R1～R4・F1a・F2a の補強は構造設計者の確認後に施工。",
        "10.【VE】ガラ・割栗石の場内再利用（水はけ層・埋戻し下層）は構造設計者の承認後。",
    ]
    sh.T(200, y0 + 4, "着工前 確認事項（監督・設計者）", h=3.0, bold=True, c="#b00000")
    yy = y0 - 2
    for t in chk:
        sh.T(200, yy, t, h=2.15); yy -= 3.7
    sh.save()

# ============================================================== S-06 電柱回避・建柱車施工検討
EXC_WORK, EXC_SLOPE, EXC_DEPTH = 0.5, 0.5, 2.10   # 作業幅 m／法勾配 1:0.5／掘削深さ m（GL+50 → -2050）
SHEET_PILE = 0.1 + EXC_WORK                       # （参考）通常の作業幅で掘る場合の掘削底端
PW, PSL = 0.3, 0.3                                # 電柱側：作業幅0.3m・法勾配1:0.3（矢板なし、11/14方針）
P_TOP = 0.1 + PW + PSL * EXC_DEPTH                # 電柱側 掘削天端：西面外面から外側へ
WARN_C = "#c00030"
TRUCK_W, TRUCK_L, TRUCK_OR = 2.3, 8.0, 4.0         # 建柱車 代表寸法（全幅・全長・アウトリガ張出幅）

def truck(sh, v, c, ang, lab, col):
    u = np.array([math.cos(rad(ang)), math.sin(rad(ang))]); n = np.array([-u[1], u[0]])
    box = [c + u * TRUCK_L / 2 + n * TRUCK_W / 2, c - u * TRUCK_L / 2 + n * TRUCK_W / 2,
           c - u * TRUCK_L / 2 - n * TRUCK_W / 2, c + u * TRUCK_L / 2 - n * TRUCK_W / 2]
    sh.poly(v.P(box), fc="#fff8d0", ec=col, lw=0.4, z=6)
    orb = [c + u * 3.0 + n * TRUCK_OR / 2, c - u * 3.0 + n * TRUCK_OR / 2, c - u * 3.0 - n * TRUCK_OR / 2, c + u * 3.0 - n * TRUCK_OR / 2]
    sh.poly(v.P(orb), ec=col, lw=0.25, ls=(0, (3, 1.5)), z=6)
    p = v(c); sh.T(p[0], p[1], lab, h=2.4, ha="center", va="center", c=col, bold=True, z=7)

def sheet_pole(pdf):
    sh = Sheet(pdf, "電柱回避・建柱車 施工検討図", "S-06", "1/150")
    sh.T(20, 278, "電柱回避・建柱車 施工検討図   平面 S=1/150 ／ 断面 S=1/150", h=5.0, bold=True)
    # ---------------- 平面
    v = View(46.7, 226, 150, unit_mm=1000)
    sh.T(20, 268, "① 平面（電柱・上空線・掘削範囲・建柱車据付候補）", h=2.8, bold=True)
    sh.L(v.P([BSW, BNW, NE, SE]), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    sh.L(v.P([BSW, BSW + np.array([25.4, 0]), SE]), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    # 掘削範囲（敷地側：底盤端＋砕石0.1＋作業0.5＋法1:0.5）
    exc_in = offset_poly(OUTER, B_FOOT / 1000 + 0.1 + EXC_WORK + EXC_SLOPE * EXC_DEPTH)
    sh.poly(v.P(OUTER + exc_in[::-1]), fc="#f1f1f1", ec="#999", lw=0.2, ls=(0, (2, 1)), z=1)
    sh.poly(v.P(OUTER + INNER_F[::-1]), fc="#eef3fb", ec="#4060a0", lw=0.2, z=2)
    sh.poly(v.P(OUTER + INNER_W[::-1]), fc="#bbbbbb", ec="k", lw=0.4, z=3)
    plan_pole(sh, v, dims=False, label=False)
    # 西面外側 電柱側の注意区間（矢板なし。電柱前後 各3m を分割掘削）
    a, b = max(0.0, POLE_S_W - 3.0), POLE_S_W + 3.0
    sp = [NW + D_W * a - N_IN_W * P_TOP, NW + D_W * b - N_IN_W * P_TOP]
    sh.L(v.P(sp), lw=1.0, c=WARN_C, ls=(0, (4, 1.5)), z=8)
    q = v(sp[1]); sh.leader([q, q + np.array([2, -16]), q + np.array([4, -16])],
                           f"注意区間 L≒{b-a:.1f}m（矢板なし・分割掘削）\n掘削天端～電柱表面 約{POLE_TO_WALL-P_TOP-POLE_R:.2f}m", h=1.9, ha="left", c=WARN_C)
    # 建柱車 候補
    cA = np.array([POLE[0] - 0.4, 3.2])
    truck(sh, v, cA, 0, "A", "#c07000")
    pA = v(cA); sh.L([pA, v(POLE)], lw=0.3, c="#c07000", ls=(0, (4, 1.5)))
    rA = np.linalg.norm(cA - POLE)
    m = (pA + v(POLE)) / 2; sh.T(m[0] + 1, m[1], f"R≒{rA:.1f}m", h=1.9, c="#c07000")
    # B：北面・西面の掘削範囲（境界から約4.65m）の外。東西向きに据付
    e = B_FOOT / 1000 + 0.1 + EXC_WORK + EXC_SLOPE * EXC_DEPTH
    yB = -(e + TRUCK_OR / 2 + 0.3)
    tB = -yB / -D_W[1]
    xw = (NW + D_W * tB)[0] + e / N_IN_W[0]
    cB = np.array([xw + TRUCK_L / 2 + 0.3, yB])
    truck(sh, v, cB, 0, "B", "#6a3d9a")
    pB = v(cB); sh.L([pB, v(POLE)], lw=0.3, c="#6a3d9a", ls=(0, (4, 1.5)))
    rB = np.linalg.norm(cB - POLE)
    m = (pB + v(POLE)) / 2; sh.T(m[0], m[1] - 3.2, f"R≒{rB:.1f}m", h=1.9, c="#6a3d9a", ha="center")
    sh.T(*v(-3.8, 1.2), "北側隣地（田）", h=2.0, c="#555")
    sh.T(*v(12.0, 1.2), "隣地境界線（北面 擁壁外面）", h=1.8, c="#555")
    sh.T(*v(10.0, -10.9), "道路", h=2.4, c="#555")
    p = v(POLE); sh.T(p[0] - 1.5, p[1] - 3.8, "電柱", h=2.0, ha="right", c=POLE_C, bold=True)
    sh.T(*v(9.5, -3.2), "掘削範囲（法1:0.5・作業幅0.5）", h=1.8, c="#666")
    # 凡例
    lx, ly = 22, 154
    for i, (col, t) in enumerate([("#c07000", "A：北側隣地に据付"), ("#6a3d9a", "B：敷地内（掘削範囲外）に据付"),
                                  ("#d00060", "上空線（平面方向は調査位置図読取）"), (WARN_C, "電柱側 注意区間（矢板なし）")]):
        sh.L([(lx + i * 52, ly), (lx + i * 52 + 6, ly)], lw=0.8, c=col)
        sh.T(lx + i * 52 + 7.5, ly - 0.7, t, h=1.8)
    sh.T(lx, ly - 5, f"建柱車は代表寸法（全幅{TRUCK_W}m×全長{TRUCK_L:.0f}m、アウトリガ張出幅{TRUCK_OR:.0f}m を点線）で表示。機種は九州電力の配車による。", h=1.7)

    # ---------------- 断面（新西面に直角・電柱位置）
    vs = View(78, 72, 150, unit_mm=1000)
    sh.T(20, 142, "② 断面（新西面に直角・電柱位置）  高さは推定・要実測", h=2.8, bold=True)
    X = lambda d, z: vs(d - OFF_W, z)        # d：境界からの距離（m）、z：レベル（m）
    gl_strip = 0.05
    sh.L([X(-4.0, -1.66), X(0, -1.66), X(0, gl_strip), X(OFF_W - P_TOP, gl_strip)], lw=0.35)
    sh.L([X(OFF_W + 0.25, 0.0), X(OFF_W + 6.0, 0.0)], lw=0.35)
    sh.T(*X(-3.9, -1.5), "田 -1660", h=1.7, c="#555")
    sh.T(*X(0.1, gl_strip + 0.9), "帯状部（現況）", h=1.6, c="#8a5a00")
    # 擁壁
    wall = [(OFF_W, -1.9), (OFF_W + 3.0, -1.9), (OFF_W + 3.0, -1.4), (OFF_W + 0.25, -1.4), (OFF_W + 0.25, 0.2), (OFF_W, 0.2)]
    sh.poly([X(*p) for p in wall], fc="#dddddd", ec="k", lw=0.4, z=3)
    # 掘削：電柱側（矢板なし）作業幅0.3・法勾配1:0.3。点線は通常（作業幅0.5・1:0.5）の場合
    x0 = OFF_W - SHEET_PILE
    sh.L([X(x0, -2.05), X(x0 - EXC_SLOPE * EXC_DEPTH, gl_strip)], lw=0.3, c="#999", ls=(0, (2, 1)))
    q = X(x0 - EXC_SLOPE * EXC_DEPTH * 0.5, -1.0)
    sh.leader([q, X(OFF_W + 3.6, -4.9), X(OFF_W + 3.8, -4.9)], "通常の法勾配（点線）は電柱の根元に近すぎる", h=1.6, c="#888")
    xb = OFF_W - 0.1 - PW
    sh.L([X(xb, -2.05), X(OFF_W - P_TOP, gl_strip)], lw=1.0, c=WARN_C, z=5)
    sh.T(*X(xb + 0.1, -2.9), "電柱側：作業幅0.3・法1:0.3（矢板なし）", h=1.6, c=WARN_C)
    sh.L([X(xb, -2.05), X(OFF_W + 3.1 + 0.5, -2.05)], lw=0.3, c="#999", ls=(0, (2, 1)))
    # 電柱
    hp, emb = 10.0, 2.0
    sh.poly([X(POLE_DW - 0.15, -emb), X(POLE_DW + 0.15, -emb), X(POLE_DW + 0.09, hp), X(POLE_DW - 0.09, hp)],
            fc="#e8c8c8", ec=POLE_C, lw=0.35, z=4)
    sh.T(*X(POLE_DW - 0.3, 5.0), "電柱（推定 12m級・根入れ約2.0m）", h=1.8, rot=90, ha="center", va="bottom", c=POLE_C)
    # 電線と離隔帯
    zw = 8.5
    sh.L([X(POLE_DW, zw), X(OFF_W + 6.0, zw - 1.0)], lw=0.6, c="#d00060", z=6)
    sh.poly([X(POLE_DW, zw - 2.0), X(OFF_W + 6.0, zw - 3.0), X(OFF_W + 6.0, zw - 1.0), X(POLE_DW, zw)], fc="#fde3ee", ec="none", z=1)
    sh.L([X(POLE_DW, zw - 2.0), X(OFF_W + 6.0, zw - 3.0)], lw=0.3, c="#d00060", ls=(0, (3, 1.5)))
    sh.T(*X(OFF_W + 1.0, zw - 0.25), "上空線（高さ・電圧 要実測／仮に8.5m）", h=1.7, c="#d00060")
    sh.T(*X(OFF_W + 1.0, zw - 2.45), "離隔2.0m（九電指導値 要確認）→ 重機の作業高さ上限", h=1.7, c="#d00060")
    # レベル
    for z, t in [(0.2, "+200"), (0.0, "±0"), (-1.9, "-1900"), (-2.05, "掘削底 約-2050")]:
        p = X(OFF_W + 6.2, z); sh.T(p[0], p[1] - 0.6, t, h=1.6, c=DIMC)
    sh.dim(X(POLE_DW, -3.6), X(OFF_W, -3.6), 0, None, c=POLE_C)
    m = X(OFF_W + 0.2, -3.6); sh.T(m[0], m[1] - 0.6, f"{POLE_TO_WALL*1000:,.0f}（電柱芯～新西面外面）", h=1.7, c=POLE_C)
    sh.dim(X(0, -4.3), X(POLE_DW, -4.3), 0, None, c=POLE_C)
    m = X(POLE_DW + 0.2, -4.3); sh.T(m[0], m[1] - 0.6, f"{POLE_DW*1000:,.0f}（境界～電柱芯）", h=1.7, c=POLE_C)
    for d in (0.0, OFF_W):
        sh.L([X(d, -1.7 if d == 0 else -1.95), X(d, -4.5)], lw=0.12, c=POLE_C)

    # ---------------- 検討（右側）
    x0, y = 238, 268
    def head(t):
        nonlocal y
        sh.T(x0, y, t, h=2.6, bold=True); y -= 4.6
    def line(t, c="k"):
        nonlocal y
        sh.T(x0 + 1, y, t, h=1.95, c=c); y -= 3.25
    head("1. 前提（推定値・着工前に実測）")
    line(f"・電柱：西境界から{POLE_DW*1000:,.0f}・北境界から{POLE_DN*1000:,.0f}（配置図への手書き指示）。支柱付き。")
    line("・電柱 φ350・12m級・根入れ約2.0m と仮定。支柱の足元位置は未確認。")
    line("・上空線：電柱から南東へ敷地を斜めに横断（調査位置図）。")
    line("  電圧区分（高圧6.6kV／低圧／通信）・地上高さは未確認。")
    head("2. 擁壁と電柱の離れ")
    line(f"・新西面外面まで 芯{POLE_TO_WALL*1000:,.0f}／表面{(POLE_TO_WALL-POLE_R)*1000:,.0f}（必要1,000 → OK）")
    line(f"・通常の掘り方（作業幅0.5・法1:0.5）だと掘削天端が電柱表面から約{max(0, POLE_TO_WALL-SHEET_PILE-EXC_SLOPE*EXC_DEPTH-POLE_R):.2f}m → 不可", c="#b00000")
    line(f"・方針（11/14）：矢板は使わない。電柱前後 約{b-a:.0f}mは作業幅0.3・法1:0.3で掘る")
    line(f"  → 掘削天端～電柱表面 約{POLE_TO_WALL-P_TOP-POLE_R:.2f}m。根入れ部に近く、十分な注意が必要。", c="#b00000")
    head("3. 建柱車による電柱支持（九電作業）の可否")
    rows = [["A 北側隣地（田）", f"約{rA:.1f}m", "敷鉄板・進入路・地権者承諾", "○ 条件付"],
            ["B 敷地内（掘削範囲外）", f"約{rB:.0f}m", "掘削範囲が広く遠い・上空線の下", "× 実質不可"],
            ["C 帯状部（旧西面～新西面）", f"約{OFF_W-SHEET_PILE:.1f}m幅", "車幅＋アウトリガが入らない", "× 不可"],
            ["D 南側道路", "約9m以上", "道路使用許可・作業半径大", "△"]]
    y = sh.table(x0, y, [("据付位置", 40), ("電柱まで", 18), ("課題", 50), ("判定", 18)], rows, rh=4.4, h=1.85) - 4.5
    head("4. 上空線の下での作業（当社・協力業者）")
    line("・重機・ポンプ車・ユニック：電線から2.0m以上（九電指導値）。")
    line("  法定の最小離隔（基発第759号）：低圧1.0m／高圧1.2m。")
    line("・九電に防護管の取付を依頼。上空線の下では監視人を配置する。")
    line("・上空線の下は小旋回機（0.1～0.25m³）で作業高さを制限して使う。")
    line("・生コンはポンプ車のブームが上空線にかからない位置から打設する。")
    head("5. 結論・【警告】電柱側の掘削（矢板なし）")
    line("①電柱前後 約6mは長さ2m程度ずつ分割して掘り、当日中に砕石・捨てコンまで進める。", c="#b00000")
    line("②掘削中は九電の立会い。電柱の傾きを下げ振り・トランシットで朝・昼・夕に確認。", c="#b00000")
    line("③雨天・雨の翌日は電柱側を掘らない。法面はシートで養生する。", c="#b00000")
    line("④電柱周り1.0mに重機・ダンプ・資材を置かない。支柱の足元も同様。", c="#b00000")
    line("⑤傾き・亀裂・湧水が出たら直ちに掘削を止めて埋め戻し、九電と協議する。", c="#b00000")
    line("⑥九電が支持を求めた場合は、北側隣地（A）に建柱車を据えて支持する。")
    line(f"⑦柱状改良機は電線下に入れない → 西面 NW隅から{GAP_T0:.1f}～{GAP_T1:.1f}mは無改良とし底盤補強（S-07）。", c="#b00000")
    line("⑧着工前に九電と現地立会い：電柱・支柱・電線の位置と高さ、")
    line("  支持の要否、防護管、作業日程、費用負担を確認する。")
    sh.save()

# ============================================================== S-07 電線下 無改良区間 底盤補強図
GAP_C = "#c00030"; ADD_C = "#0050b0"; EB_C = "#6a3d9a"

def wpt(t, o=0.0):
    """西面：NW隅から t(m)・外面から敷地側へ o(m) の点"""
    return NW + D_W * t + N_IN_W * o

def sheet_gap(pdf):
    G = GAP
    sh = Sheet(pdf, "電線下 無改良区間 底盤補強図", "S-07", "1/50・1/30")
    sh.T(20, 278, "電線下 無改良区間（柱状改良なし）底盤補強図・配筋図", h=5.0, bold=True)

    # ---------------- ① 平面 1/50
    sh.T(20, 268, "① 平面（西面 NW隅付近） S=1/50", h=2.8, bold=True)
    v = View(20 + 1.8 * 20, 258, 50, unit_mm=1000)       # model x=-1.8 → paper 20
    tE = 7.6
    XN = 5.6
    sh.L(v.P([np.array([-1.6, 0.0]), np.array([XN, 0.0])]), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    sh.L(v.P([BNW + D_W * (-0.3), BNW + D_W * 8.2]), lw=0.18, ls=(0, (8, 2, 1, 2)), c="#666")
    foot = [wpt(tE), NW, np.array([XN, 0.0]), np.array([XN, -3.0]), INNER_F[1], wpt(tE, 3.0)]
    sh.poly(v.P(foot), fc="#eef3fb", ec="#4060a0", lw=0.3, z=1)
    gap = [wpt(GAP_T0), wpt(GAP_T1), wpt(GAP_T1, 3.0), wpt(GAP_T0, 3.0)]
    sh.poly(v.P(gap), fc="#fde3e8", ec=GAP_C, lw=0.4, hatch="\\\\\\\\", z=2)
    wall = [wpt(tE), NW, np.array([XN, 0.0]), np.array([XN, -0.25]), INNER_W[1], wpt(tE, 0.25)]
    sh.poly(v.P(wall), fc="#bbbbbb", ec="k", lw=0.5, hatch="////", z=4)
    sh.poly(v.P(HAUNCH[0]), fc="#999999", ec="k", lw=0.3, z=4)
    eb = [wpt(EB_T0, 3.0 - EB_B), wpt(RZ_T1, 3.0 - EB_B), wpt(RZ_T1, 3.0), wpt(EB_T0, 3.0)]
    sh.poly(v.P(eb), fc="#e8dcf5", ec=EB_C, lw=0.5, z=5)
    # 補強筋（平面表示）
    for o, c in [(0.12, ADD_C), (0.35, ADD_C), (0.58, ADD_C)]:
        sh.L(v.P([wpt(-0.0, o), wpt(RZ_T1, o)]), lw=0.5, c=c, ls=(0, (6, 1.5)), z=6)
    # 増し打ち検討（南端）
    for o in np.linspace(0.35, 2.65, 5):
        q = v(wpt(GAP_T1 + 0.35, o)); sh.circ(q[0], q[1], 0.25 * v.k, ec="#2e8b57", lw=0.3, z=6)
    # 電柱・電線
    c = v(POLE); sh.circ(c[0], c[1], POLE_R * v.k, fc=POLE_C, ec=POLE_C, z=8)
    sh.T(c[0] - 2, c[1] + 2, "電柱", h=2.0, ha="right", c=POLE_C)
    we = POLE + WIRE_DIR * 5.6
    sh.L(v.P([POLE, we]), lw=0.4, ls=(0, (10, 2, 2, 2)), c="#d00060", z=9)
    nrm = np.array([-WIRE_DIR[1], WIRE_DIR[0]])
    for sgn in (1, -1):
        sh.L(v.P([POLE + nrm * 2.0 * sgn, we + nrm * 2.0 * sgn]), lw=0.2, ls=(0, (3, 2)), c="#d00060", z=9)
    q = v(POLE + WIRE_DIR * 0.6 + nrm * 2.15)
    sh.T(q[0], q[1], "上空線（左右2.0m 改良機 進入不可）", h=1.8, rot=math.degrees(math.atan2(WIRE_DIR[1], WIRE_DIR[0])), c="#d00060")
    # 寸法（外面沿い）
    marks = [0.0, GAP_T0, GAP_T1, RZ_T1, CJ_W[0]]
    for a_, b_ in zip(marks[:-1], marks[1:]):
        sh.dim(v(wpt(b_)), v(wpt(a_)), 6.0, f"{(b_-a_)*1000:,.0f}", h=1.9)
    sh.dim(v(wpt(GAP_T1)), v(wpt(GAP_T0)), 12.0, f"無改良区間 {(GAP_T1-GAP_T0)*1000:,.0f}", h=2.0, c=GAP_C)
    sh.dim(v(wpt(RZ_T1)), v(wpt(0.0)), 18.0, f"補強区間 {RZ_T1*1000:,.0f}（継手・誘発目地なし）", h=2.0, c=ADD_C)
    p = v(wpt(CJ_W[0])); q = v(wpt(CJ_W[0], 0.6))
    sh.L([p, q], lw=0.5, c="#007a3d"); sh.T(q[0] + 1, q[1] - 1, "CJ", h=2.0, c="#007a3d", bold=True)
    # ラベル
    q = v(wpt((GAP_T0 + GAP_T1) / 2, 1.5)); sh.T(q[0], q[1], "無改良\n（電線下）".split("\n")[0], h=2.6, ha="center", c=GAP_C, bold=True)
    sh.T(q[0], q[1] - 4, "（電線下）", h=2.2, ha="center", c=GAP_C)
    q = v(wpt(4.0, 2.75)); sh.leader([q, q + np.array([18, -14]), q + np.array([20, -14])],
                                    f"R3 ヒール端補強梁（上がり梁）\n{EB_B*1000:.0f}×{EB_D*1000:.0f}（底盤共） L={RZ_T1-EB_T0:.1f}m", h=1.9, c=EB_C)
    q = v(wpt(6.0, 0.35)); sh.leader([q, q + np.array([-16, -10]), q + np.array([-18, -10])],
                                    "R2 底盤下端 壁際 3-D19（点線）", h=1.9, ha="right", c=ADD_C)
    q = v(wpt(GAP_T1 + 0.35, 2.65)); sh.leader([q, q + np.array([10, -8]), q + np.array([12, -8])],
                                             "改良体 増し打ち検討位置\n（改良業者 再計算）", h=1.8, c="#2e8b57")
    sh.T(*v(3.4, -1.0), "北面底盤（改良体あり）", h=1.9, c="#2a4a8a")
    sh.T(*v(-1.5, 0.35), "旧西面（境界）", h=1.7, c="#555")

    # ---------------- ② 断面（無改良区間）1/30
    vs = View(192, 243, 30)
    sh.T(178, 268, "② 断面 B-B（無改良区間・補強区間共通） S=1/30", h=2.8, bold=True)
    body = [(0, F_BOT), (B_FOOT, F_BOT), (B_FOOT, F_TOP + (EB_D - 0.5) * 1000), (B_FOOT - EB_B * 1000, F_TOP + (EB_D - 0.5) * 1000),
            (B_FOOT - EB_B * 1000, F_TOP), (T_WALL, F_TOP), (T_WALL, H_TOP), (0, H_TOP)]
    sh.poly(vs.P(body), fc="#f3f3f3", ec="k", lw=0.6, z=2)
    sh.poly(vs.P([(-100, F_BOT - 150), (3100, F_BOT - 150), (3100, F_BOT), (-100, F_BOT)]), fc="#fde3e8", ec=GAP_C, lw=0.3, hatch="\\\\\\\\", z=1)
    sh.T(*vs(3150, F_BOT - 120), "無改良（地盤反力は無視して検討）", h=1.8, c=GAP_C)
    sh.L([vs(T_WALL, GL), vs(3300, GL)], lw=0.3)
    # 既存配筋（細線）
    xo, xi = C_WALL + 6.5, T_WALL - C_WALL - 6.5
    yb_m, yt_m = F_BOT + C_FOOT + 6.5, F_TOP - C_FOOT - 6.5
    for pts in ([(xo, H_TOP - 80), (xo, yb_m + 20), (xo + 300, yb_m + 20)], [(xi, H_TOP - 80), (xi, yb_m + 22), (xi + 400, yb_m + 22)],
                [(xo, yt_m - 300), (xo, yt_m), (2887, yt_m), (2887, yt_m - 300)], [(xo + 14, yb_m + 300), (xo + 14, yb_m), (2873, yb_m), (2873, yb_m + 300)]):
        sh.L(vs.P(pts), lw=0.35, c="#e07070", z=3)
    # 追加配筋
    def dot(x, y, d=19, c=ADD_C):
        q = vs(x, y); sh.circ(q[0], q[1], max(0.5, d / 2 / 30), fc=c, ec=c, z=6)
    for x in (xo + 13 + 10, xi - 13 - 10):
        dot(x, H_TOP - 80 - 13 - 45)                       # R1 天端補強
    for x in (150, 350, 550):
        dot(x, yb_m + 25)                                    # R2 底盤下端 壁際
    xb0, xb1 = B_FOOT - EB_B * 1000, B_FOOT
    ztop = F_TOP + (EB_D - 0.5) * 1000
    for x in (xb0 + 90, (xb0 + xb1) / 2, xb1 - 90):
        dot(x, yb_m + 25, c=EB_C); dot(x, ztop - 60 - 13 - 10, c=EB_C)
    sh.poly(vs.P([(xb0 + 60, F_BOT + 100), (xb1 - 60, F_BOT + 100), (xb1 - 60, ztop - 60), (xb0 + 60, ztop - 60)]), ec=EB_C, lw=0.4, z=5)
    # 寸法・注記
    sh.dim(vs(0, H_TOP), vs(T_WALL, H_TOP), 6, "250", h=1.7)
    sh.dim(vs(xb0, ztop), vs(xb1, ztop), 4, f"{EB_B*1000:.0f}", h=1.7)
    sh.dim(vs(3250, F_BOT), vs(3250, ztop), 0, f"{EB_D*1000:,.0f}", h=1.7)
    sh.dim(vs(3250, ztop), vs(3250, GL), 0, f"{-ztop:,.0f}", h=1.7)
    sh.leader([vs(xi - 23, H_TOP - 138), vs(700, 150), vs(760, 150)], "R1 天端補強筋 2-D19（両面各1）", h=1.8, c=ADD_C)
    sh.leader([vs(350, yb_m + 25), vs(700, -2250), vs(760, -2250)], "R2 底盤下端 壁際 3-D19", h=1.8, c=ADD_C)
    sh.leader([vs((xb0 + xb1) / 2, ztop - 83), vs(1900, -520), vs(1850, -520)], "R3 補強梁 主筋 上下各3-D19", h=1.8, c=EB_C, ha="right")
    sh.leader([vs(xb0 + 60, -1300), vs(1900, -1000), vs(1850, -1000)], "R4 あばら筋 D13@200", h=1.8, c=EB_C, ha="right")
    sh.leader([vs(1500, yt_m), vs(1250, -700), vs(1200, -700)], "F1a/F2a 底盤主筋 追加 D13@300\n（既存と交互＝D13@150 上下）", h=1.7, c=ADD_C, ha="right")

    # ---------------- ③ 展開（敷地側から見る）1/50
    ve = View(200, 146, 50)
    sh.T(178, 166, "③ 展開（敷地内側より・西面 NW隅～） S=1/50", h=2.8, bold=True)
    T0, T1 = -0.6, 7.6
    X = lambda t, z: ve(t * 1000, z)
    sh.poly([X(T0, F_BOT), X(T1, F_BOT), X(T1, H_TOP), X(T0, H_TOP)], fc="#f4f4f4", lw=0.5, z=1)
    sh.L([X(T0, F_TOP), X(T1, F_TOP)], lw=0.25)
    sh.poly([X(EB_T0, F_TOP), X(RZ_T1, F_TOP), X(RZ_T1, ztop), X(EB_T0, ztop)], ec=EB_C, lw=0.35, ls=(0, (3, 1.5)), z=2)
    sh.poly([X(GAP_T0, F_BOT - 450), X(GAP_T1, F_BOT - 450), X(GAP_T1, F_BOT), X(GAP_T0, F_BOT)], fc="#fde3e8", ec=GAP_C, lw=0.3, hatch="\\\\\\\\", z=1)
    for t in np.arange(0.25, GAP_T0, 0.6).tolist() + np.arange(GAP_T1 + 0.35, T1, 1.1).tolist():
        sh.poly([X(t - 0.25, F_BOT - 450), X(t + 0.25, F_BOT - 450), X(t + 0.25, F_BOT), X(t - 0.25, F_BOT)], fc="#e6e6e6", ec="#888", lw=0.2, z=1)
    p = X(T1, F_BOT - 450); sh.T(p[0] + 2, p[1] + 1, "改良体 φ500（杭伏図による）", h=1.7, c="#555")
    sh.L([X(0, F_BOT - 200), X(0, H_TOP + 300)], lw=0.5, ls=(0, (8, 2, 1, 2)))
    p = X(0, H_TOP + 350); sh.T(p[0], p[1] + 1, "NW隅", h=2.0, ha="center", bold=True)
    # 補強筋の範囲
    zr1 = H_TOP - 140; zr2 = F_BOT + 135
    sh.L([X(0.76, zr1 - 0), X(-0.0, zr1), X(RZ_T1, zr1)], lw=0.8, c=ADD_C, z=5)
    sh.L([X(-0.0, zr2), X(RZ_T1, zr2)], lw=0.8, c=ADD_C, z=5)
    p = X(T0, zr1); sh.T(p[0] - 1, p[1] - 0.8, "R1", h=1.8, ha="right", c=ADD_C)
    p = X(T0, zr2); sh.T(p[0] - 1, p[1] - 0.8, "R2", h=1.8, ha="right", c=ADD_C)
    p = X(-0.05, zr1 - 250); sh.T(p[0] - 1, p[1], "北面へ折曲げ定着 40d=760", h=1.6, ha="right", c=ADD_C)
    p = X(CJ_W[0], F_TOP); sh.L([p, X(CJ_W[0], H_TOP)], lw=0.6, c="#007a3d")
    for t in (GAP_T0, GAP_T1, RZ_T1):
        sh.L([X(t, F_BOT - 500), X(t, H_TOP + 150)], lw=0.15, c="#888", ls=(0, (2, 1)))
    ks = [T0, 0.0, GAP_T0, GAP_T1, RZ_T1, CJ_W[0]]
    for a_, b_ in zip(ks[1:-1], ks[2:]):
        sh.dim(X(a_, H_TOP + 150), X(b_, H_TOP + 150), 3, f"{(b_-a_)*1000:,.0f}", h=1.7)
    p = X((GAP_T0 + GAP_T1) / 2, F_BOT - 380); sh.T(p[0], p[1], "無改良区間", h=2.0, ha="center", c=GAP_C, bold=True)

    # ---------------- ④ 検討表
    rows = [
        ["荷重 w（kN/m）", f"{G['stem']['w']:.1f}", f"{G['edge']['w']:.1f}", f"q={G['heel']['q']:.1f} kN/m²"],
        ["スパン L（m）", f"{G['stem']['L']:.2f}", f"{G['edge']['L']:.2f}", f"{G['heel']['l']:.3f}"],
        ["M=wL²/8（kN·m）", f"{G['stem']['M']:.0f}", f"{G['edge']['M']:.0f}", f"{G['heel']['M']:.1f}/m"],
        ["有効せい d（mm）", f"{G['stem']['d']:.0f}", f"{G['edge']['d']:.0f}", "393"],
        ["必要At（mm²）", f"{G['stem']['At_req']:.0f}", f"{G['edge']['At_req']:.0f}", f"{G['heel']['At_req']:.0f}/m"],
        ["配筋（引張側）", "下端3-D19＋2-D13／天端2-D19＋2-D13", "上下各3-D19", "D13@150 上下"],
        ["許容 Ma（kN·m）", f"{min(G['stem']['Ma'], G['stemTop']['Ma']):.0f}", f"{G['edge']['Ma']:.0f}", f"{G['heel']['Ma']:.1f}/m"],
        ["せん断 τ（N/mm²）≦0.70", f"{G['stem']['tau']:.2f}", f"{G['edge']['tau']:.2f}", "—"],
        ["判定", "OK", "OK", "OK"],
    ]
    sh.T(178, 93, "④ 補強検討（長期・許容応力度。無改良区間の地盤反力は無視）", h=2.8, bold=True)
    yb = sh.table(178, 90, [("項目", 44), ("立上り＋底盤（L形断面）", 62), ("ヒール端補強梁", 30), ("ヒール版（横方向）", 30)], rows, rh=3.9, h=1.75)
    sh.T(178, yb - 4, f"荷重：立上り・底盤 γc=24、ヒール上の土 1.4m×γ18、積載10kN/m²。全断面 {G['w_tot']:.1f}kN/m を立上り側と補強梁側に配分。", h=1.75)
    sh.T(178, yb - 7.5, "許容応力度：SD345（D19）215、SD295（D13）195、Fc21 長期せん断 0.70 N/mm²。j=7/8d。端部は単純支持として安全側に評価。", h=1.75)
    sh.T(178, yb - 11, f"支点反力：南端・隅角側とも約{G['R_south']:.0f}kN → 隣接する改良体へ集中。改良体の再計算・増し打ちを改良業者に依頼。", h=1.75, c="#b00000")

    # ---------------- ⑤ 特記
    lines = [
        f"1. 無改良区間：西面 NW隅から {GAP_T0*1000:,.0f}～{GAP_T1*1000:,.0f}（底盤全幅）。",
        "   電線の平面位置から左右2.0mは改良機が入れない（推定）。",
        "   打設できない改良体の範囲は改良業者と現地で確定する。",
        f"2. 補強区間：NW隅～{RZ_T1*1000:,.0f}（無改良区間の両側へ{GAP_EXT*1000:,.0f}以上）。",
        "   区間内は補強筋・横筋とも継手禁止、誘発目地なし",
        f"   （西面のCJは {CJ_W[0]*1000:,.0f} の1か所に変更）。",
        "3. R1・R2 は北端を北面へ折曲げ定着（40d=760）、",
        "   南端は無改良区間端から1.5m以上延ばし直止め。",
        "4. R3 補強梁は北面底盤（改良体あり）に一体打設で定着。",
        "5. 底盤主筋 F1・F2 は補強区間で D13@150（追加 F1a・F2a）。",
        "6. 無改良区間の底盤下も基礎砕石t100＋均しコンt50。",
        "7. 本補強は概略検討。構造設計者の確認後に施工する。",
        "8. 補強梁部の掘削・打設は電線下の作業高さ制限による（S-06）。",
    ]
    sh.note_box(20, 88, 150, "⑤ 特記事項", lines, h=1.95, lh=3.25)
    sh.save()

if __name__ == "__main__":
    with PdfPages(OUT) as pdf:
        sheet_plan(pdf)
        sheet_section(pdf)
        sheet_details(pdf)
        sheet_elev(pdf)
        sheet_bars(pdf)
        sheet_pole(pdf)
        sheet_gap(pdf)
    print("NW", ANG_NW, "NE", ANG_NE, "Vf", V_FOOT, "Vw", V_WALL, "Lout", L_OUT)
    for w in WEEP:
        print(w, WEEP[w])
