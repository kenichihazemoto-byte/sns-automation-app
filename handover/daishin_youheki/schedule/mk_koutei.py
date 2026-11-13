# -*- coding: utf-8 -*-
"""糸島 大信薬局新築工事 工程表（擁壁やり直し 詳細版）を作成"""
import sys, datetime as dt
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as CL
from openpyxl.comments import Comment

SRC, OUT = sys.argv[1], sys.argv[2]
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

SEC0, SEC1, SEC2, SEC3, SEC4, SEC5 = ("準備・既存ブロック解体", "杭工事（柱状改良）", "根切り・残土搬出",
                                      "擁壁 底盤（ベース）", "擁壁 立上り", "埋戻し・外部")
e = add(SEC0, "境界確認・丁張（遣り方）", "粟戸／測量", D(2026, 11, 16), 1,
        note="境界杭で北面・東面の擁壁外面と、西面の移動位置（境界から3.0m）を確認")
e = add(SEC0, "九電協議・電線防護管取付", "九州電力", nxt(e), 1, note="電柱・支柱の位置実測、改良機・重機の作業高さ制限を確認（S-06）")
e2 = add(SEC0, "As舗装 カッター・撤去", "土工", e, 2, note="擁壁・掘削範囲のアスファルト（約190m²）")
e = add(SEC0, "既存ブロック解体（基礎共）", "解体業者", nxt(T[-2]["s"]) if False else nxt(e), 3,
        note="北・東面の既存CB約45m＋基礎。改良体の外周列（外面から約0.25m）に干渉するため杭工事前に撤去。西面の旧ブロックは帯状部の土留めとして残す（要確認）")
e = add(SEC0, "解体ガラ・As殻 搬出", "解体業者", T[-1]["s"] + dt.timedelta(1), 3, note="4tダンプ 約8台（概算）")
e = add(SEC0, "改良機 作業床整地・敷鉄板", "地盤改良業者", nxt(e), 2)
e = add(SEC0, "杭芯出し（改良体220本）", "粟戸／地盤改良業者", nxt(e), 1)
# 杭（確定）
PS, PE = D(2026, 11, 30), D(2026, 12, 17)
add(SEC1, "柱状改良 φ500×220本【確定】", "地盤改良業者", PS, e=PE, kind="fix",
    note="確定日程。空掘1.90m（現GLから施工）、電線下（西面NW隅から0.7～5.0m）は打設しない（S-07）")
add(SEC1, "改良体 強度確認（7日強度）", "地盤改良業者", D(2026, 12, 24), 1, kind="mile", note="一軸圧縮試験結果で底盤打設可否を判断")
e = add(SEC1, "改良体 養生（掘削待ち）", "—", PE + dt.timedelta(1), 4, kind="cal")
add(SEC1, "電柱側 土留め（軽量鋼矢板）・九電立会", "土工／九州電力", nxt(PE), 2, note="電柱前後 約6m。法掘削は不可（S-06）")
# 根切り・残土
s = nxt(e - dt.timedelta(1)) if not is_work(e) else nxt(e)
e = add(SEC2, "根切り・杭頭処理（西→北→東）", "土工", D(2026, 12, 22), 7,
        note="根切り底 ±0-2050、約380m³（地山）。電線下は小旋回機で作業高さ制限。年末年始は掘削部をバリケード・ネット・シートで養生")
add(SEC2, "残土搬出（全量）", "土工", D(2026, 12, 22), e=e,
    note="場内仮置き不可（敷地約267m²の大半が掘削範囲）。約460m³（ほぐし）＝4tダンプ 約150台（約22台/日）")
e = add(SEC2, "床付け・基礎砕石敷き転圧 t100", "土工", nxt(e), 2)
e = add(SEC3, "捨てコン（均しコン t50）打設", "生コン・土工", nxt(e), 1, note="約5.6m³")
e = add(SEC3, "墨出し（底盤）", "粟戸", nxt(e), 1)
e = add(SEC3, "ベース型枠（外周・妻・EJ・前面ふかし外枠）", "型枠業者", nxt(e), 2)
e = add(SEC3, "ベース配筋（底盤筋・立上り縦筋 先組み）", "鉄筋業者", nxt(e), 3, note="鉄筋 約3.6t")
e = add(SEC3, "無改良区間 補強筋・補強梁型枠（S-07）", "鉄筋・型枠業者", nxt(e), 1, note="R2・R3・R4・F1a・F2a、補強梁 500×1000")
e = add(SEC3, "配筋検査（構造設計者確認）", "粟戸／設計者", nxt(e), 1)
e = add(SEC3, "ベースコンクリート打設", "生コン・ポンプ", nxt(e), 1,
        note="底盤＋補強梁＋前面ふかしコン 約58m³。ポンプ車ブームを上空線にかけない配置")
BASE = e
e = add(SEC3, "養生（底盤）", "—", BASE + dt.timedelta(1), 3, kind="cal")
e = add(SEC4, "墨出し（立上り）", "粟戸", nxt(nxt(BASE)), 1)
e = add(SEC4, "ベース型枠 解体", "型枠業者", nxt(e), 1)
e = add(SEC4, "立上り配筋（横筋・巾止め・天端補強R1・ハンチ・端部）", "鉄筋業者", nxt(e), 2)
e = add(SEC4, "立上り型枠（片面→水抜VP75・目地棒→返し）", "型枠業者", nxt(e), 4)
e = add(SEC4, "型枠検査・天端レベル確認", "粟戸", nxt(e), 1)
e = add(SEC4, "立上りコンクリート打設", "生コン・ポンプ", nxt(e), 1, note="約17m³")
WALL = e
e = add(SEC4, "養生（型枠存置）", "—", WALL + dt.timedelta(1), 7, kind="cal", note="冬期（平均気温5～10℃）のため7日存置")
e = add(SEC4, "脱枠・型枠搬出・Pコン処理・シーリング", "型枠業者", nxt(e), 2)
e = add(SEC5, "止水コン・裏込め砕石・吸出し防止材", "土工", nxt(e), 2)
e = add(SEC5, "埋戻し・転圧（搬入土、30cm毎）", "土工", nxt(e), 5, note="約350m³（ほぐし）＝4tダンプ 約120台。良質土（真砂土等）を搬入")
e = add(SEC5, "前面（北側）嵩上げ盛土・転圧", "土工", nxt(e), 1, note="北面全長 ±0-1500（S-02）")
e = add(SEC5, "土留め撤去・場内整地", "土工", nxt(e), 1)
WALL_DONE = e
e = add(SEC5, "外部給排水工事", "設備業者", nxt(WALL_DONE), 7, note="元工程 7日")

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
ORIG_FD = D(2027, 2, 1)                 # 元工程で擁壁完了後に始まる日（仮設電気・基礎）
NEW_FD = nxt(WALL_DONE)
shift = wdays(ORIG_FD, NEW_FD) - 1       # 作業日のずれ
def shift_d(d):
    for _ in range(shift):
        d = nxt(d)
    return d
skip = {"掘削工事", "杭工事", "砕石・捨てコン", "鉄筋", "型枠", "擁壁生コン", "埋戻し", "外部給排水工事"}
SEC6 = "建築工事（元工程を平行移動・要調整）"
for nm, s0, e0, n0, who in orig:
    if nm in skip:
        continue
    s1 = shift_d(first_work(s0))
    add(SEC6, nm, who.split("(")[0] if who else "", s1, n0, note=f"元工程 {s0:%m/%d}～{e0:%m/%d}（{n0}日）")
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
    ws.column_dimensions[CL(c)].width = 3.0
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
box(1, 27, 1, 30, "開始日", F(12), fill=GRAY); box(2, 27, 2, 30, T[0]["s"], F(9), fmt="yyyy/mm/dd")
box(1, 31, 1, 34, "終了日", F(12), fill=GRAY); box(2, 31, 2, 34, "=MAX(M8:M200)", F(9), fmt="yyyy/mm/dd")
box(1, 35, 1, 38, "作成日", F(12), fill=GRAY); box(2, 35, 2, 38, D(2026, 11, 13), F(9), fmt="yyyy/mm/dd")
box(1, 39, 2, 80, "擁壁やり直し（既存ブロック解体・残土搬出・底盤補強）を反映した詳細工程。杭工事 11/30～12/17 のみ確定。",
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
cur_sec = None
BAR = {"work": "FF66C7A6", "fix": "FFE06666", "cal": "FFBFE3D6", "mile": "FFF4B183"}
for t in T:
    if t["sec"] != cur_sec:
        cur_sec = t["sec"]
        box(row, 1, row, 26, "■ " + cur_sec, F(10, True), LFT, fill=SECF)
        for c in range(C0, C0 + ndays):
            ws.cell(row, c).fill = SECF; ws.cell(row, c).border = Border(top=thin, bottom=thin)
        ws.row_dimensions[row].height = 15
        row += 1
    r1, r2 = row, row + 1
    nm = t["name"]
    box(r1, 1, r2, 8, nm, F(9, t["kind"] == "fix", "FFB00000" if t["kind"] == "fix" else "FF000000"), LFT)
    box(r1, 9, r2, 12, t["s"], F(9), fmt="yyyy/mm/dd")
    box(r1, 13, r2, 16, t["e"], F(9), fmt="yyyy/mm/dd")
    if t["kind"] == "cal":
        box(r1, 17, r2, 20, f'=TEXT(M{r1}-I{r1}+1,"0")&"日(暦)"', F(9))
    else:
        box(r1, 17, r2, 20, f'=TEXT(NETWORKDAYS(I{r1},M{r1},休日一覧),"0")&"日"', F(9))
    box(r1, 21, r2, 26, t["who"], F(8), LFT)
    if t["note"]:
        ws.cell(r1, 1).comment = Comment(t["note"], "工程表")
    for c in range(C0, C0 + ndays):
        d = D0 + dt.timedelta(c - C0)
        for rr in (r1, r2):
            x = ws.cell(rr, c); x.border = Border(left=hair, right=hair, top=thin if rr == r1 else None, bottom=thin if rr == r2 else None)
            if not is_work(d):
                x.fill = GRAY
    sc = C0 + (t["s"] - D0).days
    lab = ws.cell(r1, sc, nm + ("【確定】" if t["kind"] == "fix" and "確定" not in nm else ""))
    lab.font = F(8, t["kind"] == "fix", "FFB00000" if t["kind"] == "fix" else "FF000000")
    lab.alignment = Alignment(horizontal="left", vertical="bottom")
    # バー（条件付き書式：開始日・終了日を変えると追従）
    rng = f"{CL(C0)}{r2}:{LASTC}{r2}"
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f"AND({CL(C0)}$5>=$I${r1},{CL(C0)}$5<=$M${r1})"],
                                                   fill=PatternFill("solid", fgColor=BAR[t["kind"]], bgColor=BAR[t["kind"]]), stopIfTrue=True))
    ws.row_dimensions[r1].height = 12; ws.row_dimensions[r2].height = 12
    row += 2
ws.freeze_panes = "AA7"
ws.sheet_view.zoomScale = 85
ws.page_setup.orientation = "landscape"; ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.print_title_rows = "4:6"

# 凡例
row += 1
box(row, 1, row, 8, "凡例", F(10, True), LFT)
for i, (k, t_) in enumerate([("work", "作業（作業日：月～金、土日祝・年末年始休み）"), ("fix", "確定工程（杭工事）"),
                             ("cal", "養生（暦日）"), ("mile", "確認・検査")]):
    c = 9 + i * 18
    ws.cell(row, c).fill = PatternFill("solid", fgColor=BAR[k]); ws.cell(row, c + 1).fill = PatternFill("solid", fgColor=BAR[k])
    ws.cell(row, c + 2, t_).font = F(9)
ws.cell(row + 1, 1, "※作業名のセルにメモ（コメント）で数量・条件を記載。開始日・終了日を書き換えるとバーと期間が追従します（作業名の表示位置は固定）。").font = F(9)

# ---------------- 条件・前提シート
c2 = wb.create_sheet("条件・前提")
c2.column_dimensions["A"].width = 4; c2.column_dimensions["B"].width = 34; c2.column_dimensions["C"].width = 90
c2["B1"] = "工程作成の条件・前提（2026/11/13 作成）"; c2["B1"].font = F(14, True)
items = [
    ("確定条件", "杭工事（柱状改良 φ500×220本）11/30～12/17。これ以外はすべて計画値。"),
    ("作業日", "月～金。土日・祝日・年末年始（12/29～1/4）は休み（元工程表の日数の数え方に合わせた）。雨天予備日は含まない。"),
    ("施工順序", "柱状改良は現GLから施工（空掘1.90m）→ 改良体養生 → 根切り・杭頭処理 → 砕石・捨てコン → 底盤 → 立上り。"),
    ("鉄筋・型枠・生コン", "同じ部位では重ねない（ラップしない）。底盤と立上りは1回ずつ一括打設（工区分けなし）。"),
    ("既存ブロック解体", "北・東面の既存CB 約45m（基礎共）を杭工事前に撤去（改良体の外周列が外面から約0.25mにあり干渉）。西面の旧ブロックは帯状部の土留めとして残す想定（要確認）。"),
    ("残土", f"根切り約380m³（地山）→ ほぐし約460m³。敷地（約267m²）の大半が掘削範囲となり場内仮置きができないため全量搬出。4tダンプ約150台、1日約22台で7日。"),
    ("埋戻し土", "良質土（真砂土等）を搬入、約350m³（ほぐし）＝4tダンプ約120台。掘削土の再利用（会社ヤード仮置き）が可能なら費用・日数を見直し。"),
    ("改良体の養生・強度", "掘削は杭完了の4日後（暦日）から。7日強度の結果（12/24頃）を確認してから底盤を打設。"),
    ("型枠存置", "底盤：打設後3日（暦日）で立上り作業。立上り：冬期のため7日（暦日）存置後に脱枠。"),
    ("電柱・電線", "九電の防護管取付・電柱位置実測を最初に実施。電柱側は土留め後に鉛直掘削。電線下は小旋回機で作業高さ制限、監視人配置。ポンプ車は上空線にブームをかけない位置に据える（S-06）。"),
    ("無改良区間", "西面 NW隅から0.7～5.0mは改良体なし。補強筋・補強梁（S-07）は構造設計者確認後に施工。配筋検査に1日を確保。"),
    ("年末年始", "12/28時点で掘削が残るため、休暇中は掘削部をバリケード・ネット・シートで養生（法面崩壊・転落防止）。"),
    ("後工程", f"仮設電気以降の建築工事は、元の工程表の順序と日数を変えずに作業日{shift}日分だけ後ろへずらした仮の日程。基礎工事は北面ヒールと申請建物の取合いがあるため擁壁埋戻し完了後に開始。"),
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
from openpyxl.workbook.defined_name import DefinedName
ref = f"'条件・前提'!$B${r0+1}:$B${r0+len(hl)}"
wb.defined_names["休日一覧"] = DefinedName("休日一覧", attr_text=ref)
wb.save(OUT)
print("WALL_DONE", WALL_DONE, "LAST", LAST, "shift", shift, "tasks", len(T))
for t in T:
    print(f"{t['sec'][:6]:8} {t['name'][:28]:30} {t['s']} {t['e']} {t['kind']}")
