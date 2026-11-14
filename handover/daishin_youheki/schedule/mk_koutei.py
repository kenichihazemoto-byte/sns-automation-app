# -*- coding: utf-8 -*-
"""糸島 大信薬局新築工事 工程表（擁壁やり直し 詳細版）を作成"""
import sys, datetime as dt
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as CL
from openpyxl.comments import Comment

SRC, OUT = sys.argv[1], sys.argv[2]
import os, json, subprocess, tempfile, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("qty_def", os.path.join(HERE, "qty_def.py"))
QD = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(QD)
RECALC = os.environ.get("RECALC")   # xlsx スキルの scripts/recalc.py

def write_qty(wb):
    """数量計算シートを作り、キー → セル番地 を返す"""
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    q = wb.create_sheet("数量計算")
    fn = "ＭＳ Ｐゴシック"; th = Side(style="thin", color="FF999999"); bd = Border(left=th, right=th, top=th, bottom=th)
    for col, w in zip("ABCDEF", (4, 40, 12, 8, 62, 70)):
        q.column_dimensions[col].width = w
    q["B1"] = "数量計算書（大信薬局様邸 擁壁工事 改3-1）"; q["B1"].font = Font(name=fn, size=14, bold=True)
    q["B2"] = "青字＝入力値（変更可）、黒字＝計算式。形状の値は擁壁施工図 改3-1 の平面形状から算出。数量はすべて概算。"
    q["B2"].font = Font(name=fn, size=9, color="FF555555")
    addr = {}; r = 4
    hdr = ("項目", "数量", "単位", "計算式", "根拠・備考")
    for sec, rows in QD.SECTIONS:
        q.cell(r, 2, sec).font = Font(name=fn, size=11, bold=True); r += 1
        for i, h in enumerate(hdr):
            x = q.cell(r, 2 + i, h); x.font = Font(name=fn, size=9, bold=True); x.fill = PatternFill("solid", fgColor="FFE7E6E6"); x.border = bd
        r += 1
        for key, name, val, unit, note in rows:
            addr[key] = f"C{r}"; r += 1
        r += 1
    r = 4
    for sec, rows in QD.SECTIONS:
        r += 2
        for key, name, val, unit, note in rows:
            q.cell(r, 2, name)
            if isinstance(val, str):
                f = val
                for k, a in addr.items():
                    f = f.replace("{" + k + "}", a)
                q.cell(r, 3, f); q.cell(r, 5, val.lstrip("=").replace("{", "［").replace("}", "］"))
                q.cell(r, 3).font = Font(name=fn, size=10)
            else:
                q.cell(r, 3, val); q.cell(r, 3).font = Font(name=fn, size=10, color="FF0000FF")
                q.cell(r, 5, "入力値")
            q.cell(r, 3).number_format = "#,##0" if unit in ("台", "日", "分", "円", "円/台", "円/台日", "回/日", "円/m³") else "#,##0.00"
            q.cell(r, 4, unit); q.cell(r, 6, note)
            for c in range(2, 7):
                x = q.cell(r, c); x.border = bd
                if c != 3:
                    x.font = Font(name=fn, size=9)
                x.alignment = Alignment(vertical="center", wrap_text=(c in (5, 6)))
            q.row_dimensions[r].height = 24
            r += 1
        r += 1
    q.cell(r + 1, 2, "式の［キー］は同じシートの数量欄を指します（例：［A_F］＝底盤面積）。キー一覧：" + "、".join(f"{k}={n}" for _, rows in QD.SECTIONS for k, n, *_ in rows)).font = Font(name=fn, size=8, color="FF777777")
    q.cell(r + 1, 2).alignment = Alignment(wrap_text=True); q.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=6)
    q.row_dimensions[r + 1].height = 90
    q.freeze_panes = "C4"
    q.page_setup.orientation = "landscape"; q.page_setup.paperSize = q.PAPERSIZE_A4
    q.page_setup.fitToWidth = 1; q.page_setup.fitToHeight = 0; q.sheet_properties.pageSetUpPr.fitToPage = True
    return addr

def calc_qty():
    tmp = tempfile.mkdtemp(); p = os.path.join(tmp, "q.xlsx")
    w = openpyxl.Workbook(); w.remove(w.active); addr = write_qty(w); w.save(p)
    out = subprocess.run([sys.executable, RECALC, p, "60"], capture_output=True, text=True).stdout
    assert '"success"' in out, out
    v = openpyxl.load_workbook(p, data_only=True)["数量計算"]
    return {k: v[a].value for k, a in addr.items()}

Q = calc_qty()
fq = lambda k, n=1: f"{Q[k]:,.{n}f}"
D = dt.date
FONT = "ＭＳ Ｐゴシック"

# ---------------- 暦
HOLI = {D(2026, 11, 23): "勤労感謝の日", D(2027, 1, 11): "成人の日", D(2027, 2, 11): "建国記念の日",
        D(2027, 2, 23): "天皇誕生日", D(2027, 3, 22): "春分の日 振替休日", D(2027, 4, 29): "昭和の日",
        D(2027, 5, 3): "憲法記念日", D(2027, 5, 4): "みどりの日", D(2027, 5, 5): "こどもの日"}
for d in range(29, 32):
    HOLI[D(2026, 12, d)] = "年末年始休暇"
for d in range(1, 5):
    HOLI[D(2027, 1, d)] = "年末年始休暇"

def is_work(d):
    return d.weekday() < 5 and d not in HOLI

def nxt(d):
    d += dt.timedelta(1)
    while not is_work(d):
        d += dt.timedelta(1)
    return d

def first_work(d):
    while not is_work(d):
        d += dt.timedelta(1)
    return d

def end_of(start, n):          # 作業日 n 日
    d = first_work(start); k = 1
    while k < n:
        d = nxt(d); k += 1
    return d

def wdays(a, b):
    n = 0; d = a
    while d <= b:
        n += is_work(d); d += dt.timedelta(1)
    return n

# ---------------- 工程（擁壁やり直し 詳細）
T = []   # dict(sec, name, who, s, e, kind) kind: work / cal(暦日) / fix / mile
def add(sec, name, who, s, n=None, e=None, kind="work", note=""):
    s = first_work(s) if kind != "cal" else s
    if e is None:
        e = end_of(s, n) if kind != "cal" else s + dt.timedelta(n - 1)
    T.append(dict(sec=sec, name=name, who=who, s=s, e=e, kind=kind, note=note))
    return e

K1, K2, K3, K4, K5, K6, K7, K8, K9 = ("準備工事【実施済】", "解体・掘削工事", "地盤改良工事（杭打ち）", "砕石・捨てコン工事",
                                      "型枠工事", "鉄筋工事", "生コン（コンクリート）工事", "埋戻し工事", "外部給排水工事")
w = lambda m, d: D(2026 if m >= 11 else 2027, m, d)
# 0 申請
KA = "申請（確認申請）"
add(KA, "確認申請 提出", "粟戸／設計", w(11, 25), 1, kind="mile", note="2026/11/25 提出")
add(KA, "審査期間（約1か月）", "指定確認検査機関", w(11, 25), e=w(12, 28), kind="cal", note="12月末までに確認済証の交付を見込む")
add(KA, "確認済証 交付（予定）", "指定確認検査機関", w(12, 28), 1, kind="mile", note="1月から建築工事に着手できる状態にする")
# 1 準備（実施済）
add(K1, "準備工事（境界確認・丁張・九電協議 ほか）", "粟戸", w(11, 11), 3, kind="done", note="11/11～11/13 実施済")
# 2 解体・掘削（杭打ち前に完了）
DEX = int(Q["D_EX"])
add(K2, "電柱まわり 養生・九電立会（矢板なし）", "土工／九州電力", w(11, 16), 1, note="矢板は使わない方針（11/14）。電柱周り1.0mは掘削・資材仮置きをしない")
add(K2, "As舗装 カッター・撤去", "土工", w(11, 16), 1, note="掘削範囲のアスファルト")
add(K2, "既存ブロック解体（基礎共）", "解体業者", w(11, 16), 2, note="北・東面の既存CB 約45m＋基礎（数量計算 6）")
add(K2, f"ガラ・As殻 搬出（{Q['T_G']:.0f}台）", "解体業者", w(11, 17), 2,
    note=f"ガラ・As殻 約{fq('V_GARA')}m³（ほぐし）＝3tダンプ {Q['T_G']:.0f}台")
EX_E = add(K2, "根切り（西→北→東）", "土工", w(11, 17), DEX,
           note=f"根切り底 ±0-2050、掘削 約{fq('V_EX')}m³（地山）。電線下は小旋回機で作業高さ制限。杭打ち（11/30）までに完了")
add(K2, "掘削土 仮置き（下段の土地）", "土工", w(11, 17), e=EX_E,
    note=f"埋戻しに再利用する土 約{fq('V_YARD')}m³（ほぐし）を隣接する下段の土地に仮置き。場外への運搬費は不要")
add(K2, f"残土処分 現場→処理場（3t {Q['T_D']:.0f}台）", "土工（ダンプ）", w(11, 17), e=EX_E,
    note=f"残土 約{fq('V_SURL')}m³（ほぐし）＝3tダンプ{Q['T_D']:.0f}台。2台ピストン・往復45分で約{Q['D_D']:.0f}日、処分費＋運搬 約{Q['C_SUR']/10000:.0f}万円。杭打ちまでに搬出しきれない分は場内に仮置き土とともに置き、後日処分")
add(K2, "床付け・改良機 作業床整地", "土工／地盤改良業者", nxt(EX_E), 1, note="改良機の施工基面（掘削底）と空掘長を改良業者と確認")
# 3 地盤改良
PS, PE = D(2026, 11, 30), D(2026, 12, 17)
add(K3, "杭芯出し（改良体220本）", "粟戸／地盤改良業者", w(11, 27), 1)
add(K3, "柱状改良 φ500×220本【確定】", "地盤改良業者", PS, e=PE, kind="fix",
    note="確定日程。電線下（西面NW隅から0.7～5.0m）は打設しない（S-07）")
add(K3, f"改良発生土 搬出・処分（{Q['T_C']:.0f}台）", "地盤改良業者", PS + dt.timedelta(1), e=PE,
    note=f"改良発生土 約{fq('V_COLS')}m³（ほぐし、発生率{Q['R_COL']:.0%}仮定）。改良業者に数量確認")
add(K3, "改良体 強度確認（7日強度）", "地盤改良業者", w(12, 24), 1, kind="mile", note="一軸圧縮試験の結果で底盤打設可否を判断")
# 4 砕石・捨てコン
e = add(K4, "杭頭処理・床付け確認", "土工", nxt(PE), 1)
e = add(K4, "基礎砕石 敷き・転圧 t100", "土工", nxt(e), 2, note=f"RC-40 約{fq('G_B')}m³（締固め後）")
e = add(K4, f"捨てコン（均しコン t50）打設 {fq('V_LEV')}m³", "生コン・土工", nxt(e), 1, note=f"約{fq('V_LEV')}m³")
e = add(K4, "墨出し（底盤）", "粟戸", nxt(e), 1)
# 5～7 型枠・鉄筋・生コン（同じ部位で重ねない）
e = add(K5, "ベース型枠 組立（外周・妻・EJ・前面ふかし外枠）", "型枠業者", nxt(e), 2)
e = add(K6, "鉄筋 搬入（加工済）", "鉄筋業者", nxt(e), 1, note="鉄筋 約3.6t（S-05）")
e = add(K6, "ベース配筋（底盤主筋F1・F2・配力筋F3）", "鉄筋業者", nxt(e), 2)
e = add(K6, "立上り縦筋 先組み（W1・W2）", "鉄筋業者", nxt(e), 1)
e = add(K6, "無改良区間 補強筋（R2・R3・R4・F1a・F2a）", "鉄筋業者", nxt(e), 1, note="S-07")
e = add(K5, "補強梁 型枠（S-07）", "型枠業者", nxt(e), 1, note="補強梁 500×1000（上がり梁）")
e = add(K6, "配筋検査（構造設計者確認）", "粟戸／設計者", nxt(e), 1, kind="mile")
BASE = add(K7, f"ベースコンクリート打設 {fq('V_BASE')}m³", "生コン・ポンプ", nxt(e), 1,
           note=f"底盤{fq('V_F')}＋補強梁{fq('V_EB')}＋前面ふかしコン{fq('V_FK')}＝{fq('V_BASE')}m³。ポンプ車ブームを上空線にかけない配置")
add(K7, "養生（底盤）", "—", BASE + dt.timedelta(1), 3, kind="cal")
e = add(K5, "墨出し（立上り）", "粟戸", nxt(BASE), 1)
e = add(K5, "ベース型枠 解体", "型枠業者", nxt(e), 1)
e = add(K6, "立上り配筋（横筋・巾止め・天端補強R1・ハンチ・端部）", "鉄筋業者", nxt(e), 2)
e = add(K5, "立上り 外側型枠 建込み", "型枠業者", nxt(e), 1)
add(K6, "立上り 配筋確認", "粟戸", e, 1, kind="mile")
e = add(K5, "水抜VP75・目地棒・セパ・Pコン 取付", "型枠業者", nxt(e), 1, note="水抜穴30か所、誘発目地7か所、伸縮目地2か所")
e = add(K5, "立上り 内側型枠（返し）建込み・締付け", "型枠業者", nxt(e), 1)
e = add(K5, "型枠検査・天端レベル・通り確認", "粟戸", nxt(e), 1, kind="mile")
WALL = add(K7, f"立上りコンクリート打設 {fq('V_W')}m³", "生コン・ポンプ", nxt(e), 1, note=f"約{fq('V_W')}m³（ハンチ含む）")
e = add(K7, "養生（型枠存置）", "—", WALL + dt.timedelta(1), 7, kind="cal", note="冬期（平均気温5～10℃）のため7日存置")
e = add(K5, "脱型・型枠搬出", "型枠業者", nxt(e), 2)
add(K5, "Pコン処理・外面シーリング", "型枠業者", e, 1)
e = add(K7, f"止水コンクリート打設 {fq('V_SUI',2)}m³", "生コン・土工", nxt(e), 1)
# 8 埋戻し
e = add(K8, "裏込め砕石・吸出し防止材", "土工", e, 2, note=f"裏込め砕石 約{fq('G_U')}m³")
DBF = int(Q["D_BF"])
add(K8, "仮置き土の戻し（下段の土地→現場）", "土工", nxt(e), DBF, note=f"仮置き土 約{fq('V_YARD')}m³（ほぐし）を戻す")
DBN = 3
NORTH = add(K8, "埋戻し・転圧 北面（建物側を先行）", "土工", nxt(e), DBN, note="建物基礎と北面ヒールが重なるため北面を先に埋め戻し、基礎工事に引き渡す")
e = add(K8, "埋戻し・転圧 西面・東面", "土工", nxt(NORTH), DBF - DBN, note=f"埋戻し 合計 約{fq('V_BF')}m³（締固め後）、30cm毎に転圧")
e = add(K8, "前面（北側）嵩上げ盛土・転圧", "土工", nxt(e), 1, note=f"約{fq('V_MO')}m³、北面全長 ±0-1500")
e = add(K8, "場内整地・下段の土地の復旧", "土工", nxt(e), 1)
WALL_DONE = e
add(K9, "外部給排水工事", "設備業者", nxt(WALL_DONE), 7, note="元工程 7日")

# ---------------- 後工程（元の工程表を平行移動）
src = openpyxl.load_workbook(SRC).active
orig = []
r = 7
while r <= src.max_row:
    nm = src.cell(r, 1).value
    if nm:
        s0 = dt.datetime.strptime(src.cell(r, 9).value, "%Y/%m/%d").date()
        e0 = dt.datetime.strptime(src.cell(r, 13).value, "%Y/%m/%d").date()
        n0 = int(str(src.cell(r, 17).value).replace("日", ""))
        orig.append((nm, s0, e0, n0, src.cell(r, 21).value))
    r += 2
ON = {nm: (s0, e0, n0) for nm, s0, e0, n0, who in orig}
dur = lambda nm: ON[nm][2]
def addn(d, n):
    for _ in range(n):
        d = nxt(d)
    return d
def back(d, n):
    for _ in range(n):
        d -= dt.timedelta(1)
        while not is_work(d):
            d -= dt.timedelta(1)
    return d
SEC6 = "建築工事"
who0 = "粟戸"
BS = nxt(NORTH)
add(SEC6, "仮設電気工事", who0, BS, dur("仮設電気工事"))
BE = add(SEC6, "基礎工事", who0, BS, dur("基礎工事"), note="北面の埋戻し完了後に着手（西・東面の埋戻しと並行）")
add(SEC6, "設備工事（先行配管）", who0, back(BE, 2), dur("設備工事"), note="元工程と同じく基礎の終盤に先行配管")
DT = add(SEC6, "土台引き", who0, nxt(BE), dur("土台引き"))
DK = add(SEC6, "大工工事", who0, DT, dur("大工工事"))
AS = add(SEC6, "足場工事", who0, nxt(DT), dur("足場工事"), note="足場解体まで")
JT = add(SEC6, "上棟", who0, addn(DT, 2), dur("上棟"), kind="mile")
add(SEC6, "屋根工事", who0, nxt(JT), dur("屋根工事"))
add(SEC6, "電気工事", who0, addn(JT, 2), dur("電気工事"))
add(SEC6, "外壁工事", who0, addn(JT, 3), dur("外壁工事"))
CR = add(SEC6, "クロス工事", who0, nxt(DK), dur("クロス工事"))
YK = add(SEC6, "床貼り工事", who0, CR, dur("床貼り工事"))
SY = add(SEC6, "照明器具取付工事", who0, nxt(YK), dur("照明器具取付工事"))
JS = add(SEC6, "住設工事", who0, nxt(SY), dur("住設工事"))
KYU_E = [t for t in T if t["name"] == "外部給排水工事"][0]["e"]
GK = add(SEC6, "外構工事", who0, max(nxt(AS), nxt(KYU_E)), dur("外構工事"), note="足場解体・外部給排水の完了後に着手し、内装工事と並行")
KS = add(SEC6, "完了検査（建築）", "指定確認検査機関", nxt(max(JS, GK)), 1, kind="mile")
CL_E = add(SEC6, "クリーニング・手直し", who0, nxt(KS), 2)
HW = add(SEC6, "引渡し", "粟戸", nxt(CL_E), 1, kind="mile")
DEADLINE = D(2027, 4, 30)
shift = 0
LAST = max(t["e"] for t in T)

# ---------------- 作図
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "工程表"
thin = Side(style="thin", color="FF808080"); hair = Side(style="hair", color="FFBFBFBF")
B = Border(left=thin, right=thin, top=thin, bottom=thin)
GRAY = PatternFill("solid", fgColor="FFE7E6E6")
SECF = PatternFill("solid", fgColor="FFDDEBF7")
def F(sz=10, b=False, c="FF000000"):
    return Font(name=FONT, size=sz, bold=b, color=c)
CEN = Alignment(horizontal="center", vertical="center", wrap_text=False)
LFT = Alignment(horizontal="left", vertical="center", wrap_text=False, shrink_to_fit=True)

D0 = D(2026, 11, 1)
DEND = max(D(2027, 5, 31), LAST + dt.timedelta(10))
ndays = (DEND - D0).days + 1
C0 = 27
for c in range(1, 27):
    ws.column_dimensions[CL(c)].width = 4.2 if c <= 8 else 3.0
for k in range(ndays):
    ws.column_dimensions[CL(C0 + k)].width = 3.0

def box(r1, c1, r2, c2, v=None, font=None, align=CEN, fill=None, fmt=None):
    if (r1, c1) != (r2, c2):
        ws.merge_cells(start_row=r1, start_column=c1, end_row=r2, end_column=c2)
    for rr in range(r1, r2 + 1):
        for cc in range(c1, c2 + 1):
            x = ws.cell(rr, cc); x.border = B
            if fill: x.fill = fill
    x = ws.cell(r1, c1); x.value = v; x.font = font or F(); x.alignment = align
    if fmt: x.number_format = fmt
    return x

box(1, 1, 2, 4, "案件名", F(12), fill=GRAY)
box(1, 5, 2, 26, "糸島　大信薬局新築工事", F(18, True))
box(1, 27, 1, 30, "開始日", F(12), fill=GRAY); box(2, 27, 2, 30, min(t["s"] for t in T), F(9), fmt="yyyy/mm/dd")
box(1, 31, 1, 34, "終了日", F(12), fill=GRAY); box(2, 31, 2, 34, "=MAX(M8:M200)", F(9), fmt="yyyy/mm/dd")
box(1, 35, 1, 38, "作成日", F(12), fill=GRAY); box(2, 35, 2, 38, D(2026, 11, 14), F(9), fmt="yyyy/mm/dd")
box(1, 39, 2, 80, "準備工事 11/11～11/13 実施済。掘削・残土搬出 11/16～ を先行し、杭打ち 11/30～12/17（確定）。掘削土は下段の土地に仮置きして埋戻しに再利用。工種名の左の［－］で詳細を折りたためます。",
    F(10, False, "FFB00000"), LFT)
box(4, 1, 6, 8, "工種・作業", F(12)); box(4, 9, 6, 12, "開始日", F(12)); box(4, 13, 6, 16, "終了日", F(12))
box(4, 17, 6, 20, "期間", F(12)); box(4, 21, 6, 26, "担当・業者", F(12))
WD = "日月火水木金土"
mstart = None
for k in range(ndays):
    d = D0 + dt.timedelta(k); c = C0 + k
    x = ws.cell(5, c, d); x.number_format = "d"; x.font = F(9); x.alignment = CEN; x.border = B
    y = ws.cell(6, c, WD[(d.weekday() + 1) % 7]); y.font = F(9, c="FFC00000" if not is_work(d) else "FF000000"); y.alignment = CEN; y.border = B
    if not is_work(d):
        x.fill = GRAY; y.fill = GRAY
        if d in HOLI:
            y.comment = None
    if d.day == 1 or k == 0:
        if mstart is not None:
            box(4, mstart[0], 4, c - 1, mstart[1], F(10, True), LFT)
        mstart = (c, f"{d.year}年{d.month}月")
box(4, mstart[0], 4, C0 + ndays - 1, mstart[1], F(10, True), LFT)
ws.row_dimensions[1].height = 22; ws.row_dimensions[2].height = 22

LASTC = CL(C0 + ndays - 1)
row = 7
BAR = {"work": "FF66C7A6", "fix": "FFE06666", "cal": "FFBFE3D6", "mile": "FFF4B183", "done": "FFB0B0B0", "head": "FF2E8B6A"}
order = []
for t in T:
    if t["sec"] not in order:
        order.append(t["sec"])
groups = [(sec, sorted([t for t in T if t["sec"] == sec], key=lambda t: (t["s"], t["e"]))) for sec in order]

def gantt_cells(r1, r2, s_, kind, top_line=True):
    for c in range(C0, C0 + ndays):
        d = D0 + dt.timedelta(c - C0)
        for rr in range(r1, r2 + 1):
            x = ws.cell(rr, c); x.border = Border(left=hair, right=hair, top=thin if rr == r1 else None, bottom=thin if rr == r2 else None)
            if not is_work(d):
                x.fill = GRAY
    rng = f"{CL(C0)}{r2}:{LASTC}{r2}"
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f"AND({CL(C0)}$5>=$I${r1},{CL(C0)}$5<=$M${r1})"],
                                                   fill=PatternFill("solid", fgColor=BAR[kind], bgColor=BAR[kind]), stopIfTrue=True))

for sec, items in groups:
    # 工種（見出し）：配下の作業の最初～最後をまとめて表示
    rh = row; c_first = rh + 1; c_last = rh + 2 * len(items)
    box(rh, 1, rh, 8, "■ " + sec, F(10, True), LFT, fill=SECF)
    box(rh, 9, rh, 12, f"=MIN(I{c_first}:I{c_last})", F(9, True), fmt="yyyy/mm/dd", fill=SECF)
    box(rh, 13, rh, 16, f"=MAX(M{c_first}:M{c_last})", F(9, True), fmt="yyyy/mm/dd", fill=SECF)
    box(rh, 17, rh, 20, f'=TEXT(NETWORKDAYS(I{rh},M{rh},休日一覧),"0")&"日"', F(9, True), fill=SECF)
    box(rh, 21, rh, 26, "", F(8), LFT, fill=SECF)
    gantt_cells(rh, rh, None, "done" if "実施済" in sec else "head")
    ws.row_dimensions[rh].height = 15
    row += 1
    for t in items:
        r1, r2 = row, row + 1
        nm = t["name"]
        red = t["kind"] == "fix"
        box(r1, 1, r2, 8, "　" + nm, F(9, red, "FFB00000" if red else "FF000000"), Alignment(horizontal="left", vertical="center", indent=1, shrink_to_fit=True))
        box(r1, 9, r2, 12, t["s"], F(9), fmt="yyyy/mm/dd")
        box(r1, 13, r2, 16, t["e"], F(9), fmt="yyyy/mm/dd")
        if t["kind"] == "cal":
            box(r1, 17, r2, 20, f'=TEXT(M{r1}-I{r1}+1,"0")&"日(暦)"', F(9))
        else:
            box(r1, 17, r2, 20, f'=TEXT(NETWORKDAYS(I{r1},M{r1},休日一覧),"0")&"日"', F(9))
        box(r1, 21, r2, 26, t["who"], F(8), LFT)
        if t["note"]:
            ws.cell(r1, 1).comment = Comment(t["note"], "工程表")
        gantt_cells(r1, r2, t["s"], t["kind"])
        sc = C0 + (t["s"] - D0).days
        lab = ws.cell(r1, sc, nm)
        lab.font = F(8, red, "FFB00000" if red else "FF000000")
        lab.alignment = Alignment(horizontal="left", vertical="bottom")
        for rr in (r1, r2):
            ws.row_dimensions[rr].height = 12
            ws.row_dimensions[rr].outlineLevel = 1
        row += 2
ws.sheet_properties.outlinePr.summaryBelow = False
ws.freeze_panes = "AA7"
ws.sheet_view.zoomScale = 85
ws.page_setup.orientation = "landscape"; ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.print_title_rows = "4:6"

# 凡例
row += 1
box(row, 1, row, 8, "凡例", F(10, True), LFT)
for i, (k, t_) in enumerate([("head", "工種（配下の作業の期間）"), ("work", "作業（月～金、土日祝・年末年始休み）"), ("fix", "確定工程（杭打ち）"),
                             ("cal", "養生（暦日）"), ("mile", "確認・検査"), ("done", "実施済")]):
    c = 9 + i * 16
    ws.cell(row, c).fill = PatternFill("solid", fgColor=BAR[k]); ws.cell(row, c + 1).fill = PatternFill("solid", fgColor=BAR[k])
    ws.cell(row, c + 2, t_).font = F(9)
QA = write_qty(wb)
sm = [("生コン 合計", "V_RC", "m³"), ("　底盤打設（底盤＋補強梁＋ふかし）", "V_BASE", "m³"), ("　立上り打設", "V_W", "m³"),
      ("　捨てコン", "V_LEV", "m³"), ("砕石（締固め後）", "G_ALL", "m³"), ("掘削（地山）", "V_EX", "m³"),
      ("下段の土地に仮置き→埋戻し（ほぐし）", "V_YARD", "m³"), ("土の処分量（ほぐし）", "V_SOIL", "m³"), ("ガラ・As殻（ほぐし）", "V_GARA", "m³"),
      ("ダンプ 現場→処分場", "T_D", "台")]
r0s = row + 3
box(r0s, 1, r0s, 26, "数量サマリー（数量計算シートを参照）", F(10, True), LFT, fill=SECF)
for i, (lab_, k, u) in enumerate(sm):
    rr = r0s + 1 + i
    box(rr, 1, rr, 12, lab_, F(9), LFT)
    box(rr, 13, rr, 18, f"='数量計算'!{QA[k]}", F(9), fmt="#,##0.0" if u != "台" else "#,##0")
    box(rr, 19, rr, 20, u, F(9))
ws.cell(row + 1, 1, "※作業名のセルにメモ（コメント）で数量・条件を記載。開始日・終了日を書き換えるとバーと期間が追従します（作業名の表示位置は固定）。").font = F(9)

# ---------------- 条件・前提シート
c2 = wb.create_sheet("条件・前提")
c2.column_dimensions["A"].width = 4; c2.column_dimensions["B"].width = 34; c2.column_dimensions["C"].width = 90
c2["B1"] = "工程作成の条件・前提（2026/11/13 作成）"; c2["B1"].font = F(14, True)
items = [
    ("確定条件", "杭打ち（柱状改良 φ500×220本）11/30～12/17。準備工事 11/11～11/13 は実施済。これ以外は計画値。"),
    ("作業日", "月～金。土日・祝日・年末年始（12/29～1/4）は休み（元工程表の日数の数え方に合わせた）。雨天予備日は含まない。"),
    ("施工順序", "準備 → 解体・掘削・残土搬出（11/16～、杭打ち前に完了）→ 杭打ち → 杭頭処理 → 砕石・捨てコン → 底盤（型枠→鉄筋→生コン）→ 立上り（鉄筋→型枠→生コン）→ 埋戻し。改良機の施工基面（掘削底）と空掘長は改良業者と確認。"),
    ("鉄筋・型枠・生コン", "同じ部位では重ねない（ラップしない）。底盤と立上りは1回ずつ一括打設（工区分けなし）。"),
    ("既存ブロック解体", "北・東面の既存CB 約45m（基礎共）を杭工事前に撤去（改良体の外周列が外面から約0.25mにあり干渉）。西面の旧ブロックは帯状部の土留めとして残す想定（要確認）。"),
    ("掘削土の扱い", f"埋戻しに使う土は隣接する下段の土地に仮置きし、埋戻し時に戻す（場外運搬なし）。掘削 約{fq('V_EX')}m³（地山）、仮置き 約{fq('V_YARD')}m³（ほぐし）。"),
    ("残土処分", f"残土 約{fq('V_SURL')}m³（ほぐし）＝{Q['T_D']:.0f}台を処分場へ直送。改良発生土 約{fq('V_COLS')}m³（{Q['T_C']:.0f}台、発生率は仮定）を合わせた土の処分量 約{fq('V_SOIL')}m³。別にガラ・As殻 約{fq('V_GARA')}m³（{Q['T_G']:.0f}台）。"),
    ("数量の根拠", "「数量計算」シートに入力値と計算式を記載。ダンプ台数・往復時間・土量変化率を変えると台数と日数が再計算される（工程表の日付は自動では変わらない）。"),
    ("改良体の強度", "杭打ち完了の翌作業日に杭頭処理。7日強度の結果（12/24頃）を確認してから底盤を打設（1/14）。"),
    ("型枠存置", "底盤：打設後3日（暦日）で立上り作業。立上り：冬期のため7日（暦日）存置後に脱枠。"),
    ("電柱・電線", "九電の防護管取付・電柱位置実測を最初に実施。電柱周り1.0mは掘削・資材仮置きをしない（矢板は使わない）。電線下は小旋回機で作業高さ制限、監視人配置。ポンプ車は上空線にブームをかけない位置に据える（S-06）。"),
    ("無改良区間", "西面 NW隅から0.7～5.0mは改良体なし。補強筋・補強梁（S-07）は構造設計者確認後に施工。配筋検査に1日を確保。"),
    ("残土の残り", "杭打ち開始（11/30）までに搬出しきれない残土は、場内に仮置き土とともに置き、後日処分する。"),
    ("年末年始", "12/28にベース型枠まで進めて休み（12/29～1/4）。休暇中は掘削部・型枠をバリケード・ネット・シートで養生。"),
    ("建築工事", "元の工程表の各工事の日数はそのまま使い、順序を組み直した。基礎工事は北面の埋戻し完了後に着手（北面ヒールと建物が重なるため）。外構工事は足場解体・外部給排水の完了後に内装と並行。最後に完了検査・クリーニング・引渡し。"),
    ("確認申請", "11/25 提出、約1か月の審査で12月末に確認済証交付の見込み。建物の基礎着手は2月中旬のため、交付が遅れても約7週間の余裕がある。"),
    ("結果", f"擁壁埋戻し完了 {WALL_DONE:%Y/%m/%d}（元工程 2027/01/29）、全体完了 {LAST:%Y/%m/%d}（元工程 外構 2027/04/14）。"),
]
for i, (k, v) in enumerate(items):
    c2.cell(3 + i, 2, k).font = F(10, True); c2.cell(3 + i, 3, v).font = F(10)
    c2.cell(3 + i, 3).alignment = Alignment(wrap_text=True, vertical="top"); c2.cell(3 + i, 2).alignment = Alignment(vertical="top")
    c2.row_dimensions[3 + i].height = 30
r0 = 3 + len(items) + 2
c2.cell(r0, 2, "休日一覧（期間の計算に使用）").font = F(11, True)
hl = sorted(HOLI)
for i, d in enumerate(hl):
    x = c2.cell(r0 + 1 + i, 2, d); x.number_format = "yyyy/mm/dd"; x.font = F(10)
    c2.cell(r0 + 1 + i, 3, HOLI[d]).font = F(10)
c2.page_setup.orientation = "landscape"; c2.page_setup.fitToWidth = 1; c2.page_setup.fitToHeight = 0
c2.sheet_properties.pageSetUpPr.fitToPage = True
from openpyxl.workbook.defined_name import DefinedName
# ---------------- 実現性チェック
ck = wb.create_sheet("実現性チェック")
fn = FONT
for col, wdt in zip("ABCDEFGH", (3, 34, 12, 12, 10, 8, 60, 50)):
    ck.column_dimensions[col].width = wdt
ck["B1"] = "工程の実現性・余裕度チェック（2026/11/14）"; ck["B1"].font = F(14, True)
ck["B2"] = "余裕＝計画日の翌日から期限（最終許容日）までの作業日数（月～金、祝日・年末年始を除く）。◎10日以上／○5日以上／△1日以上／余裕0＝遅れがそのまま後ろへ響く（クリティカル）。雨天中止日は工程に含めていない。"; ck["B2"].font = F(9, c="FF555555")
hdr = ("確認ポイント", "計画日", "期限（最終許容日）", "余裕（作業日）", "評価", "根拠・リスク", "対策")
for i, h in enumerate(hdr):
    x = ck.cell(4, 2 + i, h); x.font = F(10, True); x.fill = GRAY; x.border = B; x.alignment = CEN
def tget(name):
    return [t for t in T if t["name"].startswith(name)][0]
EXE = tget("根切り")["e"]; BASEP = tget("ベースコンクリート打設")["s"]
rowsC = [
    ("掘削・残土搬出の完了 → 杭打ち開始", EXE, back(D(2026, 11, 30), 1), "根切り7日を11/17～11/26で実施。11/27は床付け・杭芯出し。",
     "雨で遅れた残土は場内に仮置き土とともに置き、杭打ち後に処分（指示どおり）。11/21（土）を予備日にできるよう業者と調整。"),
    ("確認済証の交付 → 建物の基礎着手", D(2026, 12, 28), back(tget("基礎工事")["s"], 1), "審査約1か月で12月末交付の見込み。基礎着手は2月中旬。",
     "審査の質疑は早めに回答。交付が1月にずれても建物工程への影響はない。"),
    ("改良体の7日強度 → 底盤打設", D(2026, 12, 24), back(BASEP, 1), "最後の改良体の7日強度は12/24。底盤打設は1/15。",
     "試験結果を年内に受領しておく。"),
    ("S-07 補強の構造確認 → 無改良区間の配筋", D(2026, 12, 25), back(tget("無改良区間 補強筋")["s"], 1), "構造設計者の確認を年内に得る前提。",
     "未了だと配筋検査・底盤打設が止まる。11月中に構造設計者へ依頼する。"),
    ("北面の埋戻し完了 → 基礎着手", NORTH, back(tget("基礎工事")["s"], 1), "北面を先に埋め戻し、翌作業日から基礎。ここが全体の要（クリティカル）。",
     "立上りを早強セメントにすると型枠存置を約3日短縮でき、余裕が増える。"),
    ("内装・外構の完了 → 完了検査", max(tget("住設工事")["e"], tget("外構工事")["e"]), back(tget("完了検査")["s"], 1), "外構工事が内装より4日遅く、外構が最後の工程になる。",
     "外構は足場解体の翌日から着手。駐車場以外を先行するなど分割すれば短縮できる。"),
    ("引渡し → 4月末", HW, DEADLINE, "引渡し 4/16 計画。4/30まで作業日9日の余裕。",
     "雨天見込み（下記）を差し引くと余裕はほぼない。週次で進捗を確認し、遅れは土曜作業で取り戻す。"),
]
r = 5
for name_, plan, due, why, how in rowsC:
    ck.cell(r, 2, name_); ck.cell(r, 3, plan).number_format = "yyyy/mm/dd"; ck.cell(r, 4, due).number_format = "yyyy/mm/dd"
    ck.cell(r, 5, f"=IF(D{r}<=C{r},0,NETWORKDAYS(C{r}+1,D{r},休日一覧))")
    ck.cell(r, 6, f'=IF(E{r}>=10,"◎",IF(E{r}>=5,"○",IF(E{r}>=1,"△","余裕0")))')
    ck.cell(r, 7, why); ck.cell(r, 8, how)
    for c in range(2, 9):
        x = ck.cell(r, c); x.border = B; x.font = F(9); x.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center" if c in (3, 4, 5, 6) else "left")
    ck.row_dimensions[r].height = 42
    r += 1
r += 1
ck.cell(r, 2, "雨天リスクの見込み").font = F(11, True); r += 1
rain = [("擁壁工事（12/18～2/22、作業日 約40日）", 5, "冬期の福岡は1か月に約10日の降水日。土工・打設・型枠建込みが止まる日を約5日と見込む。"),
        ("建物の外部工事（上棟～外構、作業日 約25日）", 3, "上棟・屋根・外壁・外構が雨の影響を受ける。約3日と見込む。")]
for i, h in enumerate(("区間", "見込み（作業日）", "", "", "", "考え方")):
    if h:
        x = ck.cell(r, 2 + i, h); x.font = F(10, True); x.fill = GRAY; x.border = B
r += 1
r_rain0 = r
for a_, n_, c_ in rain:
    ck.cell(r, 2, a_).font = F(9); ck.cell(r, 3, n_).font = F(9, c="FF0000FF"); ck.cell(r, 7, c_).font = F(9)
    for c in (2, 3, 7):
        ck.cell(r, c).border = B
    r += 1
ck.cell(r, 2, "雨天見込み 合計").font = F(10, True); ck.cell(r, 3, f"=SUM(C{r_rain0}:C{r-1})").font = F(10, True)
r += 1
ck.cell(r, 2, "引渡しまでの余裕 − 雨天見込み").font = F(10, True)
ck.cell(r, 3, f"=E11-C{r-1}").font = F(10, True, "FFB00000")
ck.cell(r, 7, "0以上なら4月末に間に合う見込み。マイナスなら土曜作業・早強セメント・外構の分割で取り戻す。").font = F(9)
r += 2
ck.cell(r, 2, "総合評価").font = F(11, True)
ck.cell(r + 1, 2, "4月末完了は実現可能。ただし余裕は作業日9日で、雨天見込み約8日を差し引くと約1日しかない。"
                  "クリティカルは「掘削（杭打ち前）」「北面埋戻し → 基礎」「外構」の3点。").font = F(10)
ck.cell(r + 2, 2, "余裕を増やす手段：①立上りに早強セメント（約3日）②外構の分割着手（約3～4日）③遅れた週は土曜作業。①②を採用すると余裕は約15日になる。").font = F(10)
ck.page_setup.orientation = "landscape"; ck.page_setup.fitToWidth = 1; ck.page_setup.fitToHeight = 0
ck.sheet_properties.pageSetUpPr.fitToPage = True
wb.active = 0
ref = f"'条件・前提'!$B${r0+1}:$B${r0+len(hl)}"
wb.defined_names["休日一覧"] = DefinedName("休日一覧", attr_text=ref)
wb.save(OUT)
print("WALL_DONE", WALL_DONE, "LAST", LAST, "shift", shift, "tasks", len(T))
for t in T:
    print(f"{t['sec'][:6]:8} {t['name'][:28]:30} {t['s']} {t['e']} {t['kind']}")
