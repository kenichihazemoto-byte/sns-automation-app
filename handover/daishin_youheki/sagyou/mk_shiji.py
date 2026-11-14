# -*- coding: utf-8 -*-
"""自社職人向け 作業指示書（図入り・A4横）：ブロック塀解体／電柱養生／残土の処分・仮置き／破壊コンクリートの再利用"""
import sys, os, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib import font_manager as fm
from matplotlib.patches import Polygon, Circle, Rectangle, FancyBboxPatch, FancyArrowPatch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "src"))
OUT = sys.argv[1]
_argv = sys.argv; sys.argv = [sys.argv[0], os.devnull]
import youheki as Y
sys.argv = _argv

FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
fm.fontManager.addfont(FONT)
plt.rcParams["font.family"] = fm.FontProperties(fname=FONT).get_name()
PT = 1 / 0.3528
RED, BLUE, GRN, ORG, GRY, PUR = "#c00000", "#1f5fbf", "#2e8b57", "#d07000", "#777777", "#6a3d9a"
DATE = "2026/11/14"
N_DISPOSE = int(sys.argv[2]) if len(sys.argv) > 2 else 41     # 処理場へ出す台数（3tダンプ・土）実行予算書 改3-2「土の収支」標準
N_ROCK = 16                                                    # 岩の山の上限（3t台数）ガラを先に使うため 約32m³

class Page:
    def __init__(self, pdf, no, title, sub):
        self.pdf = pdf
        self.fig = plt.figure(figsize=(297 / 25.4, 210 / 25.4))
        self.ax = self.fig.add_axes([0, 0, 1, 1]); self.ax.set_xlim(0, 297); self.ax.set_ylim(0, 210)
        self.ax.set_aspect("equal"); self.ax.axis("off")
        a = self.ax
        a.add_patch(Rectangle((6, 6), 285, 198, fill=False, lw=1.2))
        a.add_patch(Rectangle((6, 186), 285, 18, fc="#1f3f6f", ec="none"))
        self.T(10, 196.5, f"作業指示書 No.{no}", 13, c="white", b=True)
        self.T(52, 196.5, title, 16, c="white", b=True)
        self.T(10, 189, "大信薬局様邸新築工事（糸島・擁壁工事）　第3版", 8.5, c="white")
        self.T(287, 196.5, f"指示：櫨本　現場責任者：粟戸　{DATE}", 8.5, c="white", ha="right")
        self.T(287, 189.5, "作業者サイン：＿＿＿＿＿＿＿＿　＿＿＿＿＿＿＿＿", 8.5, c="white", ha="right")
        self.T(10, 181, sub, 9.5, c="#1f3f6f", b=True)
        self.box(10, 8, 277, 10, fc="#fff3b0", ec="#c00000", lw=1.0, r=1.2, z=8)
        self.T(14, 13, "★大事：使うのは この「第3版（2026/11/14）」と 図面「改3-2」だけ。古い紙（第1版・第2版・改3-1）は すぐに捨てる。分からないときは 粟戸さんに聞く。",
               9.2, c="#c00000", b=True)

    def T(self, x, y, s, sz=9, c="k", b=False, ha="left", va="center", rot=0):
        self.ax.text(x, y, s, fontsize=sz, color=c, fontweight="bold" if b else "normal", ha=ha, va=va, rotation=rot, zorder=10)

    def L(self, pts, lw=0.6, c="k", ls="-", z=3):
        p = np.array(pts); self.ax.plot(p[:, 0], p[:, 1], lw=lw, color=c, ls=ls, zorder=z, solid_capstyle="butt")

    def box(self, x, y, w, h, fc="white", ec="k", lw=0.6, r=1.5, z=2):
        self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}", fc=fc, ec=ec, lw=lw, zorder=z))

    def arrow(self, a, b, c="k", lw=1.2):
        self.ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=10, color=c, lw=lw, zorder=6))

    def lines(self, x, y, items, sz=8.6, lh=5.0, c="k"):
        for it in items:
            col = c; bold = False
            if isinstance(it, tuple):
                it, col, bold = it[0], it[1], (it[2] if len(it) > 2 else False)
            self.T(x, y, it, sz, c=col, b=bold); y -= lh
        return y

    def okng(self, x, y, w, ok, ng, title_ok="○ してよい", title_ng="× してはいけない", lh=4.8, sz=8.2):
        h = max(len(ok), len(ng)) * lh + 9
        self.box(x, y - h, w / 2 - 1, h, fc="#eaf6ee", ec=GRN)
        self.box(x + w / 2 + 1, y - h, w / 2 - 1, h, fc="#fdecec", ec=RED)
        self.T(x + 2, y - 4, title_ok, 9.5, c=GRN, b=True); self.T(x + w / 2 + 3, y - 4, title_ng, 9.5, c=RED, b=True)
        yy = y - 9.5
        for s in ok:
            self.T(x + 2.5, yy, s, sz); yy -= lh
        yy = y - 9.5
        for s in ng:
            self.T(x + w / 2 + 3.5, yy, s, sz); yy -= lh
        return y - h

    def save(self):
        self.pdf.savefig(self.fig)
        self.fig.savefig(OUT.replace(".pdf", f"_{self.no_png}.png"), dpi=110)
        plt.close(self.fig)

def site_plan(pg, ox, oy, k, show_cb=True, show_piles=False, show_pole=True):
    """敷地の略図（モデル m → 用紙 mm：k mm/m）"""
    P = lambda p: (ox + p[0] * k, oy + p[1] * k)
    bnd = [Y.BSW, Y.BNW, Y.NE, Y.SE]
    pg.L([P(p) for p in bnd], lw=0.5, c=GRY, ls=(0, (6, 2, 1, 2)))
    pg.L([P(Y.BSW), P(Y.BSW + np.array([25.4, 0])), P(Y.SE)], lw=0.5, c=GRY, ls=(0, (6, 2, 1, 2)))
    wall = Y.OUTER + Y.INNER_W[::-1]
    pg.ax.add_patch(Polygon([P(p) for p in Y.OUTER + Y.INNER_F[::-1]], closed=True, fc="#eef3fb", ec="#8aa0c8", lw=0.4, zorder=1))
    pg.ax.add_patch(Polygon([P(p) for p in wall], closed=True, fc="#bbbbbb", ec="k", lw=0.5, zorder=2))
    pg.T(*P((14, -6.5)), "敷地（駐車場）", 8, c=GRY, ha="center")
    pg.T(*P((14, -11.6)), "道路", 8, c=GRY, ha="center"); pg.T(*P((31.5, -5)), "道路", 8, c=GRY)
    pg.T(*P((-4.3, -6)), "水路", 8, c=GRY, ha="right")
    if show_pole:
        c = P(Y.POLE)
        pg.ax.add_patch(Circle(c, 1.175 * k, fc="#fde3e3", ec=RED, lw=0.8, zorder=4))
        pg.ax.add_patch(Circle(c, 0.6, fc=RED, ec=RED, zorder=5))
        pg.T(c[0] - 2, c[1] + 4.5, "電柱", 8, c=RED, b=True, ha="right")
    if show_cb:
        pg.L([P(Y.BNW + np.array([0.2, 0])), P(Y.NE)], lw=2.6, c=RED, z=5)
        pg.L([P(Y.NE), P(Y.SE)], lw=2.6, c=RED, z=5)
        pg.L([P(Y.BNW), P(Y.BSW)], lw=2.6, c=BLUE, z=5)
    if show_piles:
        pass
    return P

with PdfPages(OUT) as pdf:
    # ================================================= No.1 ブロック塀の解体
    pg = Page(pdf, 1, "既存ブロック塀の解体", "北面・東面の既存ブロック塀を基礎まで撤去する。西面の旧ブロックは残す。分別を徹底し、ガラは指示書No.4へ。")
    pg.no_png = "No1"
    P = site_plan(pg, 30, 160, 4.2)
    pg.T(30, 172, "① 解体範囲（平面）", 10, b=True)
    pg.L([(170, 168), (180, 168)], lw=2.6, c=RED); pg.T(182, 168, "解体する（北面・東面 約45m、基礎まで）", 8.5)
    pg.L([(170, 162), (180, 162)], lw=2.6, c=BLUE); pg.T(182, 162, "残す（西面の旧ブロック＝帯状部の土留め）", 8.5)
    pg.ax.add_patch(Circle((175, 156), 2.0, fc="#fde3e3", ec=RED)); pg.T(182, 156, "電柱の周り1.0m：近づかない（No.2）", 8.5)
    pg.ax.add_patch(Polygon([(171, 148), (179, 148), (179, 152), (171, 152)], fc="#bbbbbb", ec="k", lw=0.5)); pg.T(182, 150, "新しい擁壁の位置（参考）", 8.5)
    # 断面
    pg.T(30, 104, "② ブロック塀（断面）と解体の順番", 10, b=True)
    gx, gy = 40, 62
    pg.L([(gx - 8, gy), (gx + 40, gy)], lw=0.8)
    pg.ax.add_patch(Rectangle((gx + 10, gy - 6), 12, 6, fc="#d9d9d9", ec="k", lw=0.6))
    for i in range(4):
        pg.ax.add_patch(Rectangle((gx + 13, gy + i * 7), 6, 7, fc="#eeeeee", ec="k", lw=0.6))
    pg.L([(gx + 16, gy - 5), (gx + 16, gy + 27)], lw=0.9, c=RED)
    pg.T(gx + 22, gy + 24, "CB（ブロック）", 8); pg.T(gx + 23, gy - 3, "基礎（コンクリート）", 8); pg.T(gx + 18, gy + 10, "鉄筋", 8, c=RED)
    pg.T(gx - 8, gy + 2, "地盤", 8, c=GRY)
    for i, s in enumerate(["❶ 上の段から順に崩す", "❷ 鉄筋はカッターで切って抜く", "❸ 基礎まで掘り起こして撤去", "❹ 跡は平らにならす"]):
        pg.T(gx + 50, gy + 24 - i * 7, s, 8.6)
    pg.arrow((gx + 44, gy + 26), (gx + 44, gy - 2), c=GRY)
    # 手順
    y = 170
    pg.T(170, 140, "③ 手順", 10, b=True)
    y = pg.lines(172, 133, [
        "1. カラーコーン・トラロープで作業範囲を囲う（道路側・隣地側）",
        "2. 境界杭の位置を確認し、印をつける（壊さない・動かさない）",
        "3. 隣地・道路側へ倒さない。敷地内側へ崩す（ミニバックホウのつかみ）",
        "4. 基礎まで撤去する（新しい改良体の外周に当たるため）",
        "5. 分別して、それぞれの置場へ（下の表）",
        "6. 解体前・途中・後の写真を撮る（同じ位置から）",
    ], lh=5.6)
    pg.okng(170, 92, 115,
            ["・CB・基礎 → ガラ置場（No.4）", "・鉄筋・金物 → 金属くず（売却）", "・土 → 下段の土地（No.3）"],
            ["・ガラと土を混ぜて出す", "・ガラを埋める・土に混ぜる", "・草木・ゴミをガラに混ぜる", "・西面の旧ブロックを壊す"],
            title_ok="○ 分別して置く", title_ng="× しないこと")
    pg.T(170, 52, "※ 解体したブロック・基礎の量（m³・台数）を日報に記入する。", 8.6, c=RED, b=True)
    pg.save()

    # ================================================= No.2 電柱の養生
    pg = Page(pdf, 2, "電柱の養生と、電柱まわりの掘削", "矢板は使わない。電柱の根元に近いため、分割して掘り、毎日傾きを確認する。異常があれば直ちに中止して埋め戻す。")
    pg.no_png = "No2"
    # 平面（拡大）
    k = 9.0; ox, oy = 52, 158
    P = lambda p: (ox + p[0] * k, oy + p[1] * k)
    pg.T(12, 172, "① 平面（電柱まわり）", 10, b=True)
    pg.L([P(Y.BNW + Y.D_W * -0.3), P(Y.BNW + Y.D_W * 7.5)], lw=0.6, c=GRY, ls=(0, (6, 2, 1, 2)))
    wl = [Y.NW + Y.D_W * -0.0, Y.NW + Y.D_W * 7.5]
    pg.ax.add_patch(Polygon([P(Y.NW), P(Y.NW + Y.D_W * 7.5), P(Y.NW + Y.D_W * 7.5 + Y.N_IN_W * 0.25), P(Y.NW + Y.N_IN_W * 0.25)], fc="#bbbbbb", ec="k", lw=0.5, zorder=3))
    pg.L([P(Y.NW), P(np.array([8.0, 0]))], lw=0.6, c="k")
    c = P(Y.POLE)
    pg.ax.add_patch(Circle(c, 1.175 * k, fc="#fde3e3", ec=RED, lw=1.0, ls="--", zorder=4))
    pg.ax.add_patch(Circle(c, 0.175 * k, fc=RED, ec=RED, zorder=6))
    for ang in range(0, 360, 60):
        q = (c[0] + 1.35 * k * math.cos(math.radians(ang)), c[1] + 1.35 * k * math.sin(math.radians(ang)))
        pg.ax.add_patch(Polygon([(q[0] - 1.2, q[1] - 1.2), (q[0] + 1.2, q[1] - 1.2), (q[0], q[1] + 1.6)], fc=ORG, ec="k", lw=0.3, zorder=7))
    pg.T(c[0] - 13, c[1] + 12, "電柱（支柱付）", 8.5, c=RED, b=True)
    pg.T(c[0] - 13, c[1] - 13, "立入り・仮置き禁止 1.0m", 8, c=RED)
    # 分割掘削
    s0 = max(0.0, Y.POLE_S_W - 3.0)
    for i in range(3):
        a_, b_ = s0 + i * 2.0, s0 + (i + 1) * 2.0
        qa = Y.NW + Y.D_W * a_ - Y.N_IN_W * Y.P_TOP; qb = Y.NW + Y.D_W * b_ - Y.N_IN_W * Y.P_TOP
        pa = Y.NW + Y.D_W * a_; pb = Y.NW + Y.D_W * b_
        pg.ax.add_patch(Polygon([P(qa), P(qb), P(pb), P(pa)], fc=["#fff2cc", "#ffe0b3", "#ffd28c"][i], ec=ORG, lw=0.6, zorder=2))
        m = P((qa + pb) / 2); pg.T(m[0], m[1], "❶❷❸"[i], 11, c=ORG, b=True, ha="center")
    pg.T(95, 112, "❶→❷→❸ の順に、長さ2mずつ掘る", 9, c=ORG, b=True)
    pg.T(95, 107, "その日のうちに砕石・捨てコンまで", 8.4, c=ORG)
    pg.T(*P(Y.NW + Y.D_W * 6.8 + Y.N_IN_W * 0.9), "新しい擁壁（西面）", 8)
    # 断面
    pg.T(12, 96, "② 断面（電柱側の掘り方）", 10, b=True)
    sx, sy, sk = 40, 52, 11
    X = lambda d, z: (sx + d * sk, sy + z * sk)
    pg.L([X(-0.5, 0.05), X(Y.OFF_W - Y.P_TOP, 0.05)], lw=0.8)
    pg.L([X(Y.OFF_W - 0.4, -2.05), X(Y.OFF_W - Y.P_TOP, 0.05)], lw=1.4, c=RED)
    pg.L([X(Y.OFF_W - 0.4, -2.05), X(Y.OFF_W + 3.0, -2.05)], lw=0.6, c=GRY)
    pg.ax.add_patch(Polygon([X(Y.OFF_W, -1.9), X(Y.OFF_W + 3.0, -1.9), X(Y.OFF_W + 3.0, -1.4), X(Y.OFF_W + 0.25, -1.4), X(Y.OFF_W + 0.25, 0.2), X(Y.OFF_W, 0.2)], fc="#dddddd", ec="k", lw=0.5, zorder=3))
    pg.ax.add_patch(Polygon([X(Y.POLE_DW - 0.12, -2.0), X(Y.POLE_DW + 0.12, -2.0), X(Y.POLE_DW + 0.08, 2.2), X(Y.POLE_DW - 0.08, 2.2)], fc="#e8c8c8", ec=RED, lw=0.6, zorder=4))
    pg.T(*X(Y.POLE_DW + 0.2, 1.7), "電柱", 8.5, c=RED, b=True)
    pg.T(*X(Y.POLE_DW + 0.2, -1.2), "根入れ 約2m", 7.5, c=RED)
    pg.T(*X(Y.OFF_W - 1.15, -0.7), "法1:0.3", 8, c=RED, b=True)
    pg.T(*X(Y.OFF_W + 0.5, 0.6), "新しい擁壁", 8)
    pg.ax.annotate("", xy=X(Y.POLE_DW + 0.175, 0.35), xytext=X(Y.OFF_W - Y.P_TOP, 0.35), arrowprops=dict(arrowstyle="<->", color=RED, lw=0.7))
    pg.T(*X((Y.POLE_DW + Y.OFF_W - Y.P_TOP) / 2, 0.75), f"約{(Y.POLE_TO_WALL - Y.P_TOP - Y.POLE_R):.1f}m", 8.5, c=RED, b=True, ha="center")
    # 手順・記録
    pg.T(160, 172, "③ 手順", 10, b=True)
    pg.lines(162, 165, [
        "1. 掘る前に九電へ連絡し、立会いの日を決める（立会いなしで掘らない）",
        "2. 電柱の周り1.0mをカラーコーン6本＋トラロープで囲う",
        "3. 下げ振りを電柱の2方向（北・東）に設置し、印をつける",
        "4. ❶❷❸の順に2mずつ掘る。法面は1:0.3、作業幅0.3m",
        "5. 掘ったその日に砕石・捨てコンまで。夜は法面をシートで覆う",
        "6. 雨の日・雨の翌日は電柱側を掘らない",
    ], lh=5.4)
    pg.okng(160, 128, 128,
            ["・コーン・ロープの内側は手作業のみ", "・重機は電柱から離れて作業", "・異常は粟戸さん→九電へすぐ連絡"],
            ["・電柱周り1.0mに重機・ダンプ・資材を置く", "・支柱の足元を掘る・踏む", "・電線の下で重機のアームを高く上げる", "・まとめて長く掘る（2m超）"])
    pg.T(160, 88, "④ 傾きの確認（朝・昼・夕に記入）", 10, b=True)
    cols = ["日付", "時刻", "北方向のずれ(mm)", "東方向のずれ(mm)", "確認者"]
    ws_ = [22, 16, 34, 34, 22]
    yy = 82; xx = 160
    for w_, h_ in zip(ws_, cols):
        pg.ax.add_patch(Rectangle((xx, yy - 5), w_, 5, fc="#e7e6e6", ec="k", lw=0.4)); pg.T(xx + w_ / 2, yy - 2.5, h_, 7.5, ha="center"); xx += w_
    for rr_ in range(6):
        xx = 160
        for w_ in ws_:
            pg.ax.add_patch(Rectangle((xx, yy - 10 - rr_ * 5), w_, 5, fill=False, lw=0.4)); xx += w_
    pg.T(160, 40, "前回から5mm以上、または合計10mm以上ずれたら → すぐ掘削を止めて埋め戻し、九電へ連絡", 8.8, c=RED, b=True)
    pg.T(160, 34.5, "亀裂・湧水・電柱まわりの地面の沈みが出たときも同じ", 8.6, c=RED)
    pg.save()

    # ================================================= No.3 残土の処分・仮置き
    pg = Page(pdf, 3, "残土の処分と仮置き（3tダンプ）", f"処理場へ出すのは合計{N_DISPOSE}台まで。{N_DISPOSE}台に達したら、残りは全部「下段の土地」へ仮置き（埋戻しに使う）。")
    pg.no_png = "No3"
    pg.T(12, 172, "① 掘った物の行き先", 10, b=True)
    pg.box(14, 132, 34, 30, fc="#f3f3f3"); pg.T(31, 152, "掘削", 11, b=True, ha="center"); pg.T(31, 145, "（ミニバックホウ）", 8, ha="center"); pg.T(31, 138, "掘りながら分ける", 8, ha="center", c=RED)
    dests = [
        (152, "#fdecec", RED, f"処理場（3tダンプ）合計{N_DISPOSE}台まで", "最初に出る表層の土：土間コン下の砕石・ガラ混じり土、泥状の土、草や根の多い土"),
        (128, "#eaf6ee", GRN, "下段の土地へ仮置き（良質土の山）", f"{N_DISPOSE}台を超えた分は全部ここ。普通の土（砂質土・真砂土）＝埋戻しに使う"),
        (104, "#f1ecf8", PUR, f"岩の山（割栗石）3t {N_ROCK}台分まで", f"握りこぶしより大きい石・岩。埋戻しの下層に再利用。{N_ROCK}台分を超えたら処理場へ（台数は別に記録）"),
        (80, "#fff5e0", ORG, "ガラ置場（コンガラ・ブロック）", "土間コン・ブロック・基礎のかけら → 指示書No.4（小割りして場内で再利用、処理場へは出さない）"),
    ]
    for y_, fc, ec, t1, t2 in dests:
        pg.box(64, y_ - 9, 120, 18, fc=fc, ec=ec, lw=0.9)
        pg.T(67, y_ + 3.5, t1, 9.5, c=ec, b=True); pg.T(67, y_ - 3.5, t2, 7.6)
        pg.arrow((48, 147), (63, y_), c=ec)
    pg.T(14, 120, "杭打ち（11/30～）で出る", 8); pg.T(14, 115, "改良発生土（セメント混じり）", 8, c=PUR, b=True); pg.T(14, 110, "は別の山。土に混ぜない", 8, c=PUR)
    # 台数カウンター
    pg.T(196, 172, f"② 処理場行きカウンター（1台ごとに1マス✓）", 10, b=True)
    cols_, cell = 8, 10
    for i in range(N_DISPOSE):
        r_, c_ = divmod(i, cols_)
        x_, y_ = 198 + c_ * cell, 160 - r_ * 9
        pg.ax.add_patch(Rectangle((x_, y_ - 7), cell - 1, 8, fill=False, lw=0.5, ec=RED if i == N_DISPOSE - 1 else "k"))
        pg.T(x_ + 0.8, y_ + 0.3, str(i + 1), 5.5, c=GRY, va="top")
    rlast = (N_DISPOSE - 1) // cols_
    pg.T(198, 160 - (rlast + 1) * 9 - 2, f"{N_DISPOSE}台目（赤枠）で打ち止め → 以降は下段の土地へ", 8.6, c=RED, b=True)
    # 目安
    pg.T(196, 92, "③ 目安", 10, b=True)
    pg.lines(198, 85, [
        "・3tダンプ1台＝約2m³（山盛りにしない・シートを掛ける）",
        "・処理場まで往復45分。2台でピストン → 1日 約14台",
        f"・処理場行き（土）{N_DISPOSE}台 ≒ 3日。掘削は全部で約7日",
        "・下段の土地へは全部で 約135台分（約270m³）",
        f"・岩の山は3t {N_ROCK}台分（約{N_ROCK*2}m³）まで（ガラを先に使う）",
    ], lh=5.3)
    pg.T(12, 66, "④ 下段の土地の仮置き（配置の例）", 10, b=True)
    gx, gy = 20, 26
    pg.ax.add_patch(Rectangle((gx, gy), 150, 34, fc="#f6f1e7", ec=GRY, lw=0.6))
    pg.T(gx + 75, gy + 30, "下段の土地（場所は粟戸さんが現地で指示）", 8, c=GRY, ha="center")
    for x_, w_, fc, ec, t in [(gx + 6, 66, "#cfe8d6", GRN, "良質土の山（埋戻し用）\n高さ2m以下・シート掛け"), (gx + 78, 30, "#e2d8f0", PUR, "岩の山"), (gx + 112, 32, "#efe0f5", PUR, "改良発生土\n（12月）")]:
        pg.ax.add_patch(Polygon([(x_, gy + 4), (x_ + w_, gy + 4), (x_ + w_ - 6, gy + 22), (x_ + 6, gy + 22)], fc=fc, ec=ec, lw=0.8))
        pg.T(x_ + w_ / 2, gy + 13, t, 7.6, ha="center", c=ec, b=True)
    pg.okng(186, 60, 102,
            ["・処理場行きは台数を毎回記入", "・山は種類ごとに分けて看板を立てる", "・雨の前にシートを掛ける"],
            [f"・{N_DISPOSE}台を超えて処理場へ出す", "・良質土を処理場へ出す", "・岩・ガラ・改良土を良質土に混ぜる"], lh=4.4, sz=7.8)
    pg.save()

    # ================================================= No.4 破壊コンクリートの再利用（第2版）
    pg = Page(pdf, 4, "破壊コンクリート（土間コン・ブロック）の再利用", "処分しない。鉄筋を外して割栗石の大きさ（50～150mm）に小割りし、場内で使い切る。割らずに大きな塊のまま埋めるのは禁止。")
    pg.no_png = "No4"
    pg.T(12, 172, "① 流れ（クラッシャーは使わない）", 10, b=True)
    steps = [("ガラ置場", "土間コン・ブロック・基礎\nのかけらを集める", ORG), ("鉄筋を外す", "カッターで切る\n金属くずへ", RED),
             ("小割り", "ブレーカー・バケットで\n50～150mm（最大200mm）", BLUE), ("割栗の山", "下段の土地に置く\n土と混ぜない", GRN), ("使う", "下の②の順に使う", GRN)]
    for i, (t1, t2, c) in enumerate(steps):
        x_ = 14 + i * 56
        pg.box(x_, 140, 46, 26, fc="white", ec=c, lw=1.0)
        pg.T(x_ + 23, 160, t1, 10, c=c, b=True, ha="center")
        pg.T(x_ + 23, 149, t2, 7.8, ha="center")
        if i < len(steps) - 1:
            pg.arrow((x_ + 47, 153), (x_ + 55, 153), c=GRY)
    # 使い道（優先順）
    pg.T(12, 130, "② 使う場所（上から順に使う）", 10, b=True)
    pg.lines(14, 123, [
        ("❶ 擁壁の裏の水はけ層（西面・東面）：裏込め砕石の外側に幅50cm", BLUE, True),
        "   透水シートを挟んで入れる（下の③の図）。約16m³",
        ("❷ 西面・東面のヒールの上の埋戻しの下の層（割栗石と同じ扱い）", BLUE, True),
        "   壁から0.8m以上離す。上の60cmは良い土だけ",
        ("❸ 帯状部（旧西面～新西面）の盛土、北側の前面嵩上げの下の層", BLUE, True),
        ("❹ 下段の土地・場内の仮設通路（ぬかるみ対策）", BLUE, True),
        ("量の目安：ガラ 約29m³（土間コン約20＋ブロック・基礎約9）→ 処理場へ出すのは0を目指す", RED, True),
    ], lh=5.2, sz=8.4)
    # 断面図
    pg.T(160, 130, "③ 擁壁の裏の水はけ層（断面）", 10, b=True)
    bx, by = 172, 66
    layers = [(0, 9, "#bbbbbb", "擁壁\n(立上り)"), (9, 12, "#dfe6ee", "裏込め\n砕石\n30cm"), (21, 18, "#fff2cc", "ガラ割栗\n50cm"), (39, 40, "#efe6d4", "埋戻し土")]
    for x0_, w_, fc, t in layers:
        pg.ax.add_patch(Rectangle((bx + x0_, by), w_, 48, fc=fc, ec="k", lw=0.5, zorder=2))
        pg.T(bx + x0_ + w_ / 2, by + 24, t, 7.6, ha="center", b=True)
    pg.L([(bx + 21, by), (bx + 21, by + 48)], lw=1.4, c=GRN, ls=(0, (2, 1)), z=4)
    pg.T(bx + 21, by + 52, "透水シート", 7.6, c=GRN, ha="center", b=True)
    pg.ax.add_patch(Rectangle((bx - 3, by + 6), 13, 2.5, fc="white", ec=BLUE, lw=0.8, zorder=5))
    pg.T(bx - 4, by + 7, "水抜き穴", 7.4, c=BLUE, ha="right")
    rng = np.random.default_rng(3)
    for _ in range(22):
        cx_, cy_ = rng.uniform(bx + 23, bx + 37), rng.uniform(by + 3, by + 45)
        pts = [(cx_ + 1.6 * math.cos(t_) * rng.uniform(0.6, 1), cy_ + 1.3 * math.sin(t_) * rng.uniform(0.6, 1)) for t_ in np.linspace(0, 2 * math.pi, 6)[:-1]]
        pg.ax.add_patch(Polygon(pts, fc="#d9c08a", ec="#8a6a20", lw=0.3, zorder=3))
    pg.T(bx + 40, by - 5, "※ 壁と裏込め砕石には、ガラを当てない・混ぜない", 7.8, c=RED, ha="center")
    # してよい・いけない
    pg.okng(14, 84, 140,
            ["・鉄筋・木・土・ゴミを取り除いてから使う", "・50～150mm（最大200mm）に割る", "・1層30cm以下で敷き、すき間を土でうめて締める", "・使った場所と量を写真と日報に残す"],
            ["・割らずに大きな塊のまま埋める（不法投棄）", "・鉄筋が付いたまま使う", "・裏込め砕石の代わりに入れる・壁に当てる", "・北面ヒールの上（建物の下）に使う"], lh=5.0, sz=7.9)
    pg.T(14, 40, "※ ❶～❸は構造設計者の承認後に行う（承認までは割栗の山に置いておく）。", 8.6, c=RED, b=True)
    pg.T(14, 34, "※ 40mm以下に砕く必要はない（駐車場の路盤に使う場合だけ。今回は使わない）。", 8.6, c="k")
    pg.save()
print("ok")
