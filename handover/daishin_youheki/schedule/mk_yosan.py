# -*- coding: utf-8 -*-
"""大信薬局 擁壁工事 実行予算書（改3-1・地盤改良 亜細亜土質 6,000,000 ベース）
比較表（mk_hikaku.py の出力、計算済み）から明細を読み込んで作る。社内限定・原価入り。"""
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL

HIKAKU, OUT = sys.argv[1], sys.argv[2]
KAIRYO = 6000000          # 地盤改良 亜細亜土質（交渉額・税抜）
import math
_t = math.ceil(60 * 1.5 / 2.0); _d = math.ceil(_t / (2 * int(420 // 55)))
ROCK60 = _t * 5000 + _d * 2 * 30000
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
ws["A1"] = "可也病院 調剤薬局建築予定地 擁壁工事（擁壁地盤改良工事含む）　実行予算書（改3-1）"; ws["A1"].font = F(14, True)
ws["A2"] = ("社内限定・原価入り（お客様提出・公開不可）　作成 2026-11-14　見積＝No.900328-00（10/20、税抜18,409,091円・変更なし）　"
            "予算＝改3-1の数量（数量計算・比較表）＋地盤改良 亜細亜土質 6,000,000円（交渉中）")
ws["A2"].font = F(9, c="FF555555")
ws["A3"] = "青字＝入力値。黄色＝見積に無い追加、赤系＝現場状況の予備費。金額はすべて税抜。"; ws["A3"].font = F(9, c="FF555555")
ws.merge_cells("D4:F4"); ws["D4"] = "見積（お客様・変更なし）"
ws.merge_cells("G4:I4"); ws["G4"] = "予算（改3-1・実行）"
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
        if it["kos"] != kos:
            continue
        fill = NEWF if it["kubun"] == "追加" else None
        row_(kos, it["name"], it["unit"], it["qe"], it["pe"] if it["kubun"] != "追加" else 0, it["qn"], it["pb"], it["kubun"], it["note"], fill)
    if r > r0:
        subtotal(f"{kos} 小計", r0, r - 1)
# 現場状況の予備費（標準ケース）
r0 = r
for name, amt, note in [
    ("割栗石・岩塊の分別・処分（予備）", ROCK60, "大工チーム写真（11/12～13）。岩 約60m³（地山）×ほぐし1.5＝90m³を3tダンプ45台×5,000円＋2台×4日×30,000円。処理場の岩の受入れ要確認"),
    ("岩の分の埋戻し土 購入（予備）", 320000, "岩を処分した分。@4,000/m³（ほぐし）"),
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
    ("（参考）予備費を使わなかった場合の利益", f"=C{S0+2}+I{sub_rows[-2]}", "割栗石が少なく、手間も増えなかった場合"),
    ("（参考）旧予算（11/3）の利益", "=18409091-14659510", "地盤改良サムシング6,750,000・改3-1反映前"),
]
for i, (a, f, n) in enumerate(summ):
    ws.cell(r, 1, a).font = F(10, i in (2, 3)); ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    x = ws.cell(r, 3, f); x.font = F(11, i in (2, 3)); x.border = B
    x.number_format = "0.0%;[Red]-0.0%" if i == 3 else NUM
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
v["B1"] = "予算に入れていない削減の余地（実行できたら予算を下げる）"; v["B1"].font = F(13, True)
for i, h in enumerate(("対策", "削減見込み（標準）", "削減見込み（最大）", "条件・確認先")):
    x = v.cell(3, 2 + i, h); x.font = F(9, True); x.fill = HEAD; x.border = B
VE = [
    ("改良発生土の場内処理（埋戻しに混合）", 100000, 130000, "亜細亜は場内処理が条件。下段の土地での仮置き・混合の可否と品質を確認。処理場への搬出（3tダンプ単価で約13万円）が減る"),
    ("割栗石を帯状部（旧西面～新西面）の盛土に場内利用", 300000, 450000, "擁壁の外側で構造に影響しない範囲。電柱周り1.0mは除く。予備費の処分費が減る"),
    ("既存ブロック解体を実費に置き換え", 200000, 300000, "予算は外注500,000。自社で解体済みのため処分費＋手間の実費に"),
    ("地盤改良の本数減（交渉額に未反映の場合）", 0, 700000, "6,000,000に220本・電線下の約25本減が反映済みなら0。未反映なら追加減額を交渉"),
    ("予備費（現場状況）を使わずに済んだ場合", 0, ROCK60 + 320000 + 240000 + 200000, "割栗石が少なく、手間も増えなかった場合。掘削初日に岩の量を記録して判断"),
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
wb.active = 0
wb.save(OUT)
print("total row", RT, "summary", S0)
