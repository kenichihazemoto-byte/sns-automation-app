# -*- coding: utf-8 -*-
"""大信薬局 擁壁工事 実行予算書（改3-2・地盤改良 亜細亜土質 6,000,000 ベース）
比較表（mk_hikaku.py の出力、計算済み）から明細を読み込んで作る。社内限定・原価入り。"""
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL

HIKAKU, OUT = sys.argv[1], sys.argv[2]
KOUTEI = sys.argv[3] if len(sys.argv) > 3 else "糸島_大信薬局新築工事_工程表_擁壁詳細_2026-11-14.xlsx"
KAIRYO = 6000000          # 地盤改良 亜細亜土質（交渉額・税抜）
PREV = 2548559            # 改3-1予算（ガラ・岩を処分する前提）の利益
Q = {}
for _r in openpyxl.load_workbook(KOUTEI, data_only=True)["数量計算"].iter_rows(min_row=4, values_only=True):
    if _r[1] and isinstance(_r[2], (int, float)):
        Q[_r[1]] = _r[2]
DOMA_A, DOMA_T = 166, 0.12    # 土間コン 面積・厚さ（比較表の行と同じ。厚さは仮定）
NIN, MACH = 25000, 35000      # 自社職人 1人日、バックホウ＋ブレーカー 1日（仮定）
SB = "'改3-2_土の収支'!"
src = openpyxl.load_workbook(HIKAKU, data_only=True)["比較表"]
items = []
for r in range(6, src.max_row + 1):
    kubun = src.cell(r, 15).value
    if kubun not in ("数量精算", "変更なし", "追加"):
        continue
    items.append(dict(kos=src.cell(r, 1).value, name=src.cell(r, 2).value, unit=src.cell(r, 3).value,
                      qe=src.cell(r, 4).value or 0, qn=src.cell(r, 5).value or 0,
                      pe=src.cell(r, 7).value or 0,
                      pb=(round(src.cell(r, 13).value / src.cell(r, 5).value) if src.cell(r, 5).value else (src.cell(r, 8).value or 0)),
                      kubun=kubun, note=src.cell(r, 16).value or ""))

FN = "ＭＳ Ｐゴシック"
F = lambda sz=10, b=False, c="FF000000": Font(name=FN, size=sz, bold=b, color=c)
th = Side(style="thin", color="FF999999"); B = Border(left=th, right=th, top=th, bottom=th)
HEAD = PatternFill("solid", fgColor="FFE7E6E6"); SECF = PatternFill("solid", fgColor="FFDDEBF7")
NEWF = PatternFill("solid", fgColor="FFFFF2CC"); RISKF = PatternFill("solid", fgColor="FFFDE3E3"); TOTF = PatternFill("solid", fgColor="FFE2F0D9")
INP = "FF0000FF"; NUM = "#,##0;[Red]-#,##0"

wb = openpyxl.Workbook(); ws = wb.active; ws.title = "実行予算書"
cols = [("工種", 14), ("品名・規格", 34), ("単位", 6),
        ("数量", 9), ("単価", 10), ("金額", 12),
        ("数量", 9), ("単価", 10), ("金額", 12),
        ("差額（見積−予算）", 13), ("発注先（予定）", 16), ("区分", 9), ("根拠・備考", 62)]
for i, (h, w) in enumerate(cols, 1):
    ws.column_dimensions[CL(i)].width = w
ws["A1"] = "可也病院 調剤薬局建築予定地 擁壁工事（擁壁地盤改良工事含む）　実行予算書（改3-2）"; ws["A1"].font = F(14, True)
ws["A2"] = ("社内限定・原価入り（お客様提出・公開不可）　作成 2026-11-14　見積＝No.900328-00（10/20、税抜18,409,091円・変更なし）　"
            "予算＝改3-2の数量（数量計算・比較表）＋地盤改良 亜細亜土質 6,000,000円（交渉中）")
ws["A2"].font = F(9, c="FF555555")
ws["A3"] = "青字＝入力値。黄色＝見積に無い追加、赤系＝現場状況の予備費。金額はすべて税抜。"; ws["A3"].font = F(9, c="FF555555")
ws.merge_cells("D4:F4"); ws["D4"] = "見積（お客様・変更なし）"
ws.merge_cells("G4:I4"); ws["G4"] = "予算（改3-2・実行）"
for c in ("D4", "G4"):
    ws[c].font = F(10, True); ws[c].alignment = Alignment(horizontal="center"); ws[c].fill = HEAD
hr = 5
for i, (h, _) in enumerate(cols, 1):
    x = ws.cell(hr, i, h); x.font = F(9, True); x.fill = HEAD; x.border = B; x.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[hr].height = 26
VENDOR = {"仮設工事": "名田建設", "土工事": "太陽建機ほか", "コンクリート工事": "福岡CDC（デンヒチ経由）", "鉄筋工事": "マルショー鉄筋工業",
          "型枠工事": "名田建設", "解体工事": "自社・解体", "擁壁地盤改良工事": "亜細亜土質"}

r = hr + 1
sub_rows = []
def row_(kos, name, unit, qe, pe, qn, pb, kubun, note, fill=None, ve=None):
    global r
    ws.cell(r, 1, kos); ws.cell(r, 2, name); ws.cell(r, 3, unit)
    ws.cell(r, 4, qe); ws.cell(r, 5, pe); ws.cell(r, 6, f"=ROUND(D{r}*E{r},0)")
    ws.cell(r, 7, qn); ws.cell(r, 8, pb); ws.cell(r, 9, f"=ROUND(G{r}*H{r},0)")
    ws.cell(r, 10, f"=F{r}-I{r}"); ws.cell(r, 11, ve or VENDOR.get(kos, "未定")); ws.cell(r, 12, kubun); ws.cell(r, 13, note)
    for c in range(1, 14):
        x = ws.cell(r, c); x.border = B; x.font = F(9); x.alignment = Alignment(vertical="center", wrap_text=(c in (2, 13)))
        if c in (4, 7): x.number_format = "#,##0.00"
        elif c in (5, 6, 8, 9, 10): x.number_format = NUM
        if fill: x.fill = fill
    for c in (4, 5, 7, 8):
        ws.cell(r, c).font = F(9, c=INP)
    ws.row_dimensions[r].height = 40 if len(note) > 90 else (26 if len(note) > 50 else 18)
    r += 1

def subtotal(label, r0, r1, fill=SECF):
    global r
    ws.cell(r, 1, label).font = F(10, True)
    for c in (6, 9, 10):
        x = ws.cell(r, c, f"=SUM({CL(c)}{r0}:{CL(c)}{r1})"); x.number_format = NUM; x.font = F(10, True); x.border = B
    for c in range(1, 14):
        ws.cell(r, c).fill = fill
    sub_rows.append(r); r += 1

order = ["仮設工事", "擁壁地盤改良工事", "解体工事", "土工事", "コンクリート工事", "鉄筋工事", "型枠工事"]
for kos in order:
    r0 = r
    if kos == "擁壁地盤改良工事":
        row_(kos, "擁壁地盤改良工事（亜細亜土質 φ500 柱状改良）", "式", 1, 7500000, 1, KAIRYO, "変更なし",
             "見積は亜細亜見積（NET7,500,000）。予算は交渉額6,000,000（11/14）。杭伏図220本・電線下 約25本を打設しない分が交渉額に含まれるか書面で確認。条件：発生土は場内処理、レキ・ガラは金額変更", ve="亜細亜土質")
    for it in items:
        if it["kos"] != kos or kos == "解体工事" or it["name"] == "残土運搬・処理":
            continue
        fill = NEWF if it["kubun"] == "追加" else None
        row_(kos, it["name"], it["unit"], it["qe"], it["pe"] if it["kubun"] != "追加" else 0, it["qn"], it["pb"], it["kubun"], it["note"], fill)
    if kos == "解体工事":
        row_(kos, "既存ブロック解体（基礎共）約45m　自社職人", "式", 0, 0, 1, 2 * NIN * 3 + MACH * 3, "追加",
             f"自社職人2人×3日×{NIN:,}円＋バックホウ・ブレーカー3日×{MACH:,}円（単価は仮定）。外注500,000の予定を自社施工に（作業指示書No.1）", NEWF, ve="自社職人")
        row_(kos, "土間コンクリート斫り（ガラは場内で再利用）", "m²", 0, 0, DOMA_A, round((2 * NIN * 2 + MACH * 2) / DOMA_A), "追加",
             f"自社職人2人×2日＋ブレーカー2日。厚さ{DOMA_T}m仮定で約{DOMA_A*DOMA_T:.0f}m³。処分費は0（改3-2）", NEWF, ve="自社職人")
        row_(kos, "【改3-2】ガラ 鉄筋除去・小割り（50～150mm、最大200）", "式", 0, 0, 1, 2 * NIN * 2 + MACH * 2, "追加",
             "自社職人2人×2日＋ブレーカー2日。40mm以下には砕かない（クラッシャー不要）。鉄筋は金属くずで売却（予算では見ない）。作業指示書No.4", NEWF, ve="自社職人")
        row_(kos, "コンガラ処分", "m³", 0, 0, f"={SB}D16", 0, "追加",
             "改3-2：場内で使い切るため処分なし（構造設計者の承認が前提。不可の場合は利益欄の参考リスクを参照）", NEWF, ve="—")
    if kos == "土工事":
        row_(kos, "残土運搬・処理（余る土＋使い切れない岩）", "m³", 65.50, 25800, f"={SB}D23", f"=ROUND({SB}D26/{SB}D23,0)", "数量精算",
             "シート「改3-2_土の収支」（標準：岩60m³）。ガラ・岩を場内で使った分だけ土が余る。3tダンプ×5,000円＋2台×日数×30,000円", ve="太陽建機ほか")
        row_(kos, "【改3-2】ガラ割栗・割栗石の分別・敷均し（手間増）", "m³", 0, 0, f"={SB}D14+{SB}D15", 1500, "追加",
             "水はけ層・ヒール上の下層・帯状部・北側嵩上げの下層。1層30cm、隙間を土で目つぶしして転圧（ほぐしm³あたり1,500円・仮定）", NEWF)
        row_(kos, "【改3-2】透水シート（水はけ層の両面・上面）", "m²", 0, 0, round(17.02 * (0.8 * 2 + 0.5), 1), 600, "追加",
             "西面9.90＋東面7.12＝17.02m ×（H0.8×2＋W0.5）。材料400＋手間200円/m²（仮定）。S-02", NEWF)
    if r > r0:
        subtotal(f"{kos} 小計", r0, r - 1)
# 現場状況の予備費（標準ケース）
r0 = r
for name, amt, note in [
    ("岩が多かった場合の追加（悲観：岩100m³）", f"={SB}E29-{SB}D29", "シート「改3-2_土の収支」の悲観−標準。岩の量は掘削初日から毎日記録"),
    ("掘削の手間増（予備）", 240000, "ミニバックホウ・岩のため3日延長×8万円"),
    ("改良工事のレキ・ガラによる増額（予備）", 200000, "亜細亜の条件「レキ・ガラは金額変更」"),
]:
    row_("予備費（現場状況）", name, "式", 0, 0, 1, amt, "予備", note, RISKF, ve="—")
subtotal("予備費（現場状況）小計", r0, r - 1, RISKF)
# 諸経費（社内）
r0 = r
row_("諸経費（社内）", "現場管理費", "式", 1, 511000, 1, 355000, "変更なし", "予算発注管理表（11/3）のとおり", ve="社内")
row_("諸経費（社内）", "一般管理費", "式", 1, 308000, 1, 210000, "変更なし", "同上", ve="社内")
row_("諸経費（社内）", "端数調整値引", "式", 1, -1496, 0, 0, "変更なし", "見積書（10/20）の端数調整", ve="社内")
subtotal("諸経費（社内）小計", r0, r - 1)
# 合計
r += 1
ws.cell(r, 1, "合計").font = F(12, True)
for c in (6, 9, 10):
    x = ws.cell(r, c, "=" + "+".join(f"{CL(c)}{sr}" for sr in sub_rows)); x.number_format = NUM; x.font = F(12, True); x.border = B; x.fill = TOTF
RT = r; r += 2

# 利益サマリー
ws.cell(r, 1, "利益の見込み（税抜）").font = F(12, True); r += 1
S0 = r
summ = [
    ("受注金額（見積・変更なし）", f"=F{RT}", ""),
    ("実行予算（予備費・諸経費を含む）", f"=I{RT}", ""),
    ("利益", f"=C{S0}-C{S0+1}", ""),
    ("利益率", f"=C{S0+2}/C{S0}", ""),
    ("（参考）予備費を使わなかった場合の利益", f"=C{S0+2}+I{sub_rows[-2]}", "岩が少なく、手間も増えなかった場合"),
    ("（参考）改3-1予算の利益（ガラ・岩を処分する前提）", PREV, "改3-2で増えた利益＝上の利益−この値"),
    ("（参考）改3-2で増えた利益", f"=C{S0+2}-C{S0+5}", "ガラ・割栗石の場内再利用、ブロック解体の自社施工"),
    ("（参考リスク）ガラ再利用が不可になった場合の増減", f"=-({SB}D44-{SB}C44)", "構造設計者が不可とし、ガラを産廃で処分（3t 12,000円/台・仮定）した場合。小割り・シートが不要になる分を差し引き。予算には入れていない"),
    ("（参考）旧予算（11/3）の利益", "=18409091-14659510", "地盤改良サムシング6,750,000・改3-1反映前"),
]
for i, (a, f, n) in enumerate(summ):
    ws.cell(r, 1, a).font = F(10, i in (2, 3)); ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    x = ws.cell(r, 3, f); x.font = F(11, i in (2, 3)); x.border = B
    x.number_format = "0.0%;[Red]-0.0%" if i == 3 else NUM
    if i == 7:
        ws.cell(r, 1).font = F(10, c="FFC00000")
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=5)
    ws.cell(r, 6, n).font = F(9, c="FF555555")
    r += 1
ws.freeze_panes = "D6"
ws.page_setup.orientation = "landscape"; ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True

# ---------------- 対策（予算に入れていない削減の余地）
v = wb.create_sheet("削減の余地")
for c_, w_ in zip("ABCDE", (3, 46, 14, 14, 80)):
    v.column_dimensions[c_].width = w_
v["B1"] = "予算に入れていない削減の余地（実行できたら予算を下げる）※ガラ・割栗石の再利用とブロック解体の自社施工は改3-2で予算に組込み済み"; v["B1"].font = F(13, True)
for i, h in enumerate(("対策", "削減見込み（標準）", "削減見込み（最大）", "条件・確認先")):
    x = v.cell(3, 2 + i, h); x.font = F(9, True); x.fill = HEAD; x.border = B
VE = [
    ("改良発生土の場内処理（埋戻しに混合）", 100000, 130000, "亜細亜は場内処理が条件。下段の土地での仮置き・混合の可否と品質を確認。処理場への搬出（3tダンプ単価で約13万円）が減る"),
    ("地盤改良の本数減（交渉額に未反映の場合）", 0, 700000, "6,000,000に220本・電線下の約25本減が反映済みなら0。未反映なら追加減額を交渉"),
    ("【VE】余る土を場内（帯状部・敷地の整地・外構の盛土）で使い、処理場行きを減らす", f"=ROUND({SB}D26*{SB}D22/{SB}D23/2,-4)", f"=ROUND({SB}D26*{SB}D22/{SB}D23,-4)", "改3-2で余る土（標準 約82m³ほぐし）の半分～全部を場内で使う。施主の了承が必要。下段の土地（田）へ盛る場合は農地法・盛土規制の手続きを確認"),
    ("【VE】掘削の作業幅・法勾配を見直して掘削量を減らす（約20m³）", 90000, 150000, "敷地側の作業幅0.5→0.3m、法勾配1:0.5→1:0.3（地山の種類を確認、労働安全衛生規則の掘削勾配の範囲で）。掘削・埋戻し・仮置きが減る。電柱側は指示書No.2のとおり"),
    ("【VE】処理場の帰り便で砕石を積んで戻る", 30000, 50000, "処理場（中間処理施設）が再生砕石を販売していれば、基礎砕石・裏込め砕石の配送費を省ける"),
    ("【VE】残コンを場内で使う（捨てコン・仮設通路）", 10000, 30000, "打設日の残コンを持ち帰り処分せず、通路のぬかるみ対策などに使う"),
    ("予備費（現場状況）を使わずに済んだ場合", 0, f"='実行予算書'!I{sub_rows[-2]}", "岩が少なく、手間も増えなかった場合。掘削初日に岩の量を記録して判断"),
]
rr = 4
for a, s1, s2, n in VE:
    v.cell(rr, 2, a); v.cell(rr, 3, s1); v.cell(rr, 4, s2); v.cell(rr, 5, n)
    for c in range(2, 6):
        x = v.cell(rr, c); x.border = B; x.font = F(9, c=INP if c in (3, 4) else "FF000000"); x.alignment = Alignment(vertical="center", wrap_text=(c == 5))
        if c in (3, 4): x.number_format = NUM
    v.row_dimensions[rr].height = 30
    rr += 1
v.cell(rr, 2, "合計").font = F(10, True)
for c in (3, 4):
    x = v.cell(rr, c, f"=SUM({CL(c)}4:{CL(c)}{rr-1})"); x.number_format = NUM; x.font = F(10, True); x.border = B
rr += 2
v.cell(rr, 2, "削減を実行した場合の利益（標準）").font = F(10, True)
x = v.cell(rr, 3, f"='実行予算書'!C{S0+2}+C{rr-2}"); x.number_format = NUM; x.font = F(11, True)
v.cell(rr, 5, "実行予算書の利益＋削減見込み（標準）").font = F(9)
rr += 1
v.cell(rr, 2, "削減を実行した場合の利益率（標準）").font = F(10, True)
x = v.cell(rr, 3, f"=C{rr-1}/'実行予算書'!C{S0}"); x.number_format = "0.0%;[Red]-0.0%"; x.font = F(11, True)
# ---------------- 改3-2：土の収支（ガラ・割栗石を場内で使い、処分を最小にする）
g = wb.create_sheet("改3-2_土の収支")
for c_, w_ in zip("ABCDEFG", (3, 44, 13, 13, 13, 3, 78)):
    g.column_dimensions[c_].width = w_
g["B1"] = "改3-2：土の収支（ガラ・割栗石を場内で使い、処分を最小にする）"; g["B1"].font = F(13, True)
g["B2"] = "社内限定。青字は入力値。数量は数量計算（工程表Excel）より。予算書は「標準」を使い、「悲観−標準」を予備費にする。"; g["B2"].font = F(9, c="FF555555")
def gh(rr, cols_):
    for i_, h_ in enumerate(cols_):
        if h_:
            x_ = g.cell(rr, 2 + i_, h_); x_.font = F(9, True); x_.fill = HEAD; x_.border = B; x_.alignment = Alignment(horizontal="center", wrap_text=True)
def gl(rr, label, vals, note="", bold=False, inp=False, fmt="#,##0.0"):
    g.cell(rr, 2, label).font = F(10, bold); g.cell(rr, 2).border = B
    for i_, v_ in enumerate(vals if isinstance(vals, list) else [vals] * 3):
        if isinstance(v_, str) and "{c}" in v_:
            v_ = v_.replace("{c}", "CDE"[i_])
        x_ = g.cell(rr, 3 + i_, v_); x_.number_format = fmt; x_.font = F(10, bold, INP if inp else "FF000000"); x_.border = B
    g.cell(rr, 7, note).font = F(9); g.cell(rr, 7).alignment = Alignment(wrap_text=True, vertical="center")
    g.row_dimensions[rr].height = 28 if len(note) > 50 else 18
gh(4, ("項目", "楽観", "標準", "悲観", "", "根拠"))
gl(5, "掘削量（地山）m³", round(Q["掘削土量 合計（地山）"], 2), "数量計算4", inp=True)
gl(6, "うち岩・割栗石（地山）m³", [30, 60, 100], "現場写真（11/12～13）からの想定。掘削初日から毎日記録", inp=True, fmt="#,##0")
gl(7, "土（地山）m³", "={c}5-{c}6")
gl(8, "埋戻し・盛土（締固め後）m³", round(Q["埋戻し・盛土 合計（締固め後）"], 2), "数量計算5（北側嵩上げ含む）", inp=True)
gl(9, "解体ガラ（ブロック・基礎＋土間コン）m³", round(Q["ブロック・基礎 体積"] + DOMA_A * DOMA_T, 2),
   f"ブロック・基礎{Q['ブロック・基礎 体積']:.1f}（数量計算6）＋土間コン{DOMA_A}m²×{DOMA_T}（仮定）", inp=True)
gl(10, "ほぐし率（ガラ・岩）", 1.5, "", inp=True, fmt="0.00")
gl(11, "ガラ（ほぐし）m³", "={c}9*{c}10")
gl(12, "岩（ほぐし）m³", "={c}6*{c}10")
gl(13, "場内で使える容量（ほぐし）m³", 76, "水はけ層W500 約16（S-02）＋西・東面ヒール上の下層・帯状部・北側嵩上げの下層 約60", inp=True, fmt="#,##0")
gl(14, "ガラを使う量（ほぐし）m³", "=MIN({c}11,{c}13)", "ガラを優先（処分すると産廃で高い）")
gl(15, "岩を使う量（ほぐし）m³", "=MIN({c}12,{c}13-{c}14)")
gl(16, "ガラの残り（処分）m³", "={c}11-{c}14")
gl(17, "岩の残り（処分）m³", "={c}12-{c}15")
gl(18, "ガラ・岩が埋戻しで占める体積（締固め後）m³", "=({c}14+{c}15)/{c}10", "その分だけ土が要らなくなる")
gl(19, "土量変化率 C（締固め）／L（ほぐし）", [0.9, 0.9, 0.9], "数量計算と同じ。L＝1.2（下の行で使用）", inp=True, fmt="0.00")
gl(20, "必要な土（地山）m³", "=MAX(0,{c}8-{c}18)/{c}19")
gl(21, "余る土（地山）m³", "=MAX(0,{c}7-{c}20)")
gl(22, "余る土（ほぐし）m³", "={c}21*1.2", "処理場へ（または場内利用のVE）")
gl(23, "処分する量 合計（ほぐし）m³", "={c}22+{c}17+{c}16", "", bold=True)
gl(24, "3tダンプ 台数", "=ROUNDUP({c}23/2,0)", "1台 2.0m³（ほぐし）", fmt="#,##0")
gl(25, "搬出日数（2台ピストン・1台7往復/日）", "=ROUNDUP({c}24/14,0)", "往復45分＋積込10分、1日7時間", fmt="#,##0")
gl(26, "処分費＋運搬費 円", "={c}24*5000+{c}25*2*30000", "処分費5,000円/台＋ダンプ1台日30,000円（運転手・燃料・仮定）", fmt=NUM)
gl(27, "不足する土の購入 円", "=MAX(0,{c}20-{c}7)*1.2*4000", "4,000円/m³（ほぐし）", fmt=NUM)
gl(28, "分別・敷均しの手間増 円", "=({c}14+{c}15)*1500", "1,500円/m³（ほぐし・仮定）", fmt=NUM)
gl(29, "合計 円", "={c}26+{c}27+{c}28", "", bold=True, fmt=NUM)
gh(31, ("比較（岩は標準60m³）", "改3-2：ガラ・岩を場内", "ガラは産廃・岩は場内", "全部処分（改3-1の考え方）", "", ""))
KOWARI = 2 * NIN * 2 + MACH * 2
SHEET = round(round(17.02 * 2.1, 1) * 600)
cmp_rows = [
    ("ガラを使う量（ほぐし）m³", ["=MIN(D11,D13)", 0, 0], ""),
    ("岩を使う量（ほぐし）m³", ["=MIN(D12,D13-C32)", "=MIN(D12,D13)", 0], ""),
    ("余る土（ほぐし）m³", ["=MAX(0,D7-MAX(0,D8-({c}32+{c}33)/D10)/D19)*1.2"] * 3, "使った分だけ土が余る"),
    ("不足する土（地山）m³", ["=MAX(0,MAX(0,D8-({c}32+{c}33)/D10)/D19-D7)"] * 3, ""),
    ("処理場へ：土＋岩（ほぐし）m³", ["={c}34+D12-{c}33"] * 3, "3t 5,000円/台"),
    ("産廃へ：ガラ（ほぐし）m³", ["=D11-{c}32"] * 3, "3t 12,000円/台（仮定・要見積）"),
    ("ダンプ台数", ["=ROUNDUP({c}36/2,0)+ROUNDUP({c}37/2,0)"] * 3, ""),
    ("処分費＋運搬費 円", ["=ROUNDUP({c}36/2,0)*5000+ROUNDUP({c}37/2,0)*12000+ROUNDUP({c}38/14,0)*60000"] * 3, ""),
    ("不足する土の購入 円", ["={c}35*1.2*4000"] * 3, ""),
    ("ガラの小割り 円", [KOWARI, 0, 0], "自社職人2人×2日＋ブレーカー2日"),
    ("分別・敷均しの手間増 円", ["=({c}32+{c}33)*1500"] * 3, ""),
    ("透水シート 円", [SHEET, SHEET, 0], ""),
    ("合計 円", ["=SUM({c}39:{c}43)"] * 3, ""),
]
for i_, (lab, vals, note) in enumerate(cmp_rows):
    gl(32 + i_, lab, vals, note, bold=(lab == "合計 円"), fmt=NUM if "円" in lab or "台" in lab else "#,##0.0")
gl(46, "改3-2の効果（全部処分との差）円", "", "", bold=True, fmt=NUM)
g["C46"] = "=E44-C44"; g["C46"].number_format = NUM; g["C46"].font = F(10, True)
g.cell(47, 2, "※土の処分が3t 5,000円/台と安いため、ガラを埋戻しに使うと押し出された土の処分費がかかり、差は小さくなる。余る土を場内で使えれば（削減の余地）効果が大きくなる。").font = F(9, c="FFC00000")
rr = 49
gh(rr, ("使える場所・使えない場所", "", "", "", "", "理由・条件")); rr += 1
for a_, b_ in [
    ("○ 水はけ層 W500×H800（西面・東面、裏込め砕石W300の外側）", "透水シートで両面・上面を包む。構造設計者の承認後（依頼文 確認事項7）"),
    ("○ 西面・東面のヒール上の下層（底盤天 -1400 ～ -800）", "立上りから0.8m以上離す。補強梁（S-07）の上と周り0.3mは除く。上の60cmは良質土（確認事項6）"),
    ("○ 帯状部（旧西面～新西面）・北側の前面嵩上げの下層", "擁壁の外側で構造に影響しない。電柱・支柱の周り1.0mは除く。上面は土で覆う"),
    ("○ 仮設通路（ダンプ・重機）", "工事中のぬかるみ対策。最後は帯状部の下層へ"),
    ("× 北面ヒール上（建物の下になる範囲）", "申請建物の基礎と重なる。良質土のみで締め固める"),
    ("× 地表から60cm以内・柱状改良の範囲", "仕上げ面の沈下の原因。改良範囲のレキ・ガラは亜細亜の条件で増額"),
]:
    g.cell(rr, 2, a_).font = F(9, True); g.cell(rr, 7, b_).font = F(9)
    g.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=6)
    for c in (2, 7):
        g.cell(rr, c).border = B; g.cell(rr, c).alignment = Alignment(wrap_text=True, vertical="center")
    g.row_dimensions[rr].height = 28
    rr += 1
g.page_setup.orientation = "landscape"; g.page_setup.fitToWidth = 1; g.page_setup.fitToHeight = 0; g.sheet_properties.pageSetUpPr.fitToPage = True
wb.active = 0
wb.save(OUT)
print("total row", RT, "summary", S0)
