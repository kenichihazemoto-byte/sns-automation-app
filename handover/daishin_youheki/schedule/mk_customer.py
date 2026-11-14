# -*- coding: utf-8 -*-
"""お客様向け 工程表（数量・業者・内部メモなし）を詳細工程表から作る"""
import sys, datetime as dt
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL

SRC, OUT = sys.argv[1], sys.argv[2]
FONT = "ＭＳ Ｐゴシック"
src = openpyxl.load_workbook(SRC)["工程表"]

# 詳細工程を読み込む（区分見出し行は "■ "）
rows, sec = [], None
for r in range(7, src.max_row + 1):
    v = src.cell(r, 1).value
    if isinstance(v, str) and v.startswith("■ "):
        sec = v[2:]; continue
    s, e = src.cell(r, 9).value, src.cell(r, 13).value
    if v and isinstance(s, dt.datetime):
        rows.append((sec, v.strip("　 "), s.date(), e.date()))

def span(pred):
    sel = [(s, e) for sec, n, s, e in rows if pred(sec, n)]
    return min(s for s, _ in sel), max(e for _, e in sel)

has = lambda *ks: (lambda sec, n: any(k in n for k in ks))
insec = lambda *ks: (lambda sec, n: any(k in (sec or "") for k in ks))
G = [
    ("擁壁・造成工事", None, None, True),
    ("準備工事（実施済）", *span(insec("準備")), False),
    ("既存ブロック撤去・掘削・残土搬出", *span(insec("解体・掘削")), False),
    ("地盤改良工事", *span(has("柱状改良")), False),
    ("擁壁工事（基礎・コンクリート打設）", *span(insec("砕石・捨てコン", "型枠", "鉄筋", "生コン")), False),
    ("埋戻し", *span(insec("埋戻し")), False),
    ("建物工事", None, None, True),
    ("外部給排水工事", *span(has("外部給排水")), False),
    ("基礎工事", *span(has("基礎工事")), False),
    ("上棟", *span(has("上棟")), False),
    ("屋根・外壁工事", *span(has("屋根工事", "外壁工事")), False),
    ("大工工事", *span(has("大工工事")), False),
    ("設備・電気工事", *span(lambda sec, n: n in ("設備工事", "電気工事")), False),
    ("内装工事（クロス・床・照明・住設）", *span(has("クロス", "床貼り", "照明", "住設")), False),
    ("外構工事", *span(has("外構工事")), False),
]
LAST = max(e for _, _, _, e in rows)

wb = openpyxl.Workbook(); ws = wb.active; ws.title = "工程表（お客様用）"
th = Side(style="thin", color="FF999999"); B = Border(left=th, right=th, top=th, bottom=th)
GRAY = PatternFill("solid", fgColor="FFEFEFEF"); SECF = PatternFill("solid", fgColor="FFDDEBF7")
BAR = PatternFill("solid", fgColor="FF66C7A6"); BAR2 = PatternFill("solid", fgColor="FFE06666")
F = lambda sz=10, b=False, c="FF000000": Font(name=FONT, size=sz, bold=b, color=c)
CEN = Alignment(horizontal="center", vertical="center"); LFT = Alignment(horizontal="left", vertical="center")

# 週単位（月曜始まり）のガント
W0 = dt.date(2026, 11, 9)
W0 -= dt.timedelta(W0.weekday())
weeks = []
d = W0
while d <= LAST + dt.timedelta(6):
    weeks.append(d); d += dt.timedelta(7)
C0 = 6
ws.column_dimensions["A"].width = 2
ws.column_dimensions["B"].width = 34
for c, w in zip("CDE", (11, 11, 2)):
    ws.column_dimensions[c].width = w
for i in range(len(weeks)):
    ws.column_dimensions[CL(C0 + i)].width = 4.2

ws["B1"] = "大信薬局 糸島店 新築工事　工程表（予定）"; ws["B1"].font = F(16, True)
ws["B2"] = f"作成日 2026年11月14日　ハゼモト建設株式会社"; ws["B2"].font = F(10)
ws["B3"] = "天候・検査日程などにより前後する場合があります。日程が変わる際は改めてご連絡いたします。"; ws["B3"].font = F(9, c="FF555555")
hr = 5
for c, t in ((2, "工事項目"), (3, "開始"), (4, "完了")):
    x = ws.cell(hr, c, t); x.font = F(10, True); x.alignment = CEN; x.border = B; x.fill = GRAY
    ws.merge_cells(start_row=hr, start_column=c, end_row=hr + 1, end_column=c)
prev_m = None
for i, w in enumerate(weeks):
    c = C0 + i
    m = (w + dt.timedelta(3)).month
    if m != prev_m:
        x = ws.cell(hr, c, f"{m}月"); x.font = F(9, True); prev_m = m
    y = ws.cell(hr + 1, c, w.day); y.font = F(8); y.alignment = CEN; y.border = B; y.fill = GRAY
r = hr + 2
for name, s, e, head in G:
    if head:
        x = ws.cell(r, 2, "■ " + name); x.font = F(10, True)
        for c in range(2, C0 + len(weeks)):
            ws.cell(r, c).fill = SECF
        r += 1; continue
    ws.cell(r, 2, name).font = F(10)
    for c, v in ((3, s), (4, e)):
        x = ws.cell(r, c, v); x.number_format = "m/d"; x.font = F(10); x.alignment = CEN
    for c in range(2, 5):
        ws.cell(r, c).border = B
    for i, w in enumerate(weeks):
        x = ws.cell(r, C0 + i); x.border = Border(left=Side(style="hair", color="FFCCCCCC"), bottom=th)
        if s <= w + dt.timedelta(6) and e >= w:
            x.fill = BAR2 if name == "地盤改良工事" else BAR
    ws.row_dimensions[r].height = 18
    r += 1
r += 1
ws.cell(r, 2, f"完成予定　{LAST.month}月{LAST.day}日（予定）").font = F(12, True, "FFB00000")
ws.cell(r + 1, 2, "※準備工事（11/11～11/13）は実施済、地盤改良工事（11/30～12/17）は確定日程です。それ以外は予定です。").font = F(9)
ws.cell(r + 2, 2, "※擁壁工事は、敷地北西の電柱・電線を避けるため西側の擁壁位置を敷地内側へ移す計画としています。").font = F(9)
ws.cell(r + 3, 2, "※年末年始（12/29～1/4）は工事をお休みします。").font = F(9)
ws.cell(r + 4, 2, "※建物工事の日程は、擁壁工事の進み具合に合わせて調整いたします。").font = F(9)
ws.freeze_panes = ws.cell(hr + 2, C0)
ws.page_setup.orientation = "landscape"; ws.page_setup.paperSize = ws.PAPERSIZE_A4
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1; ws.sheet_properties.pageSetUpPr.fitToPage = True
wb.save(OUT)
print("LAST", LAST)
for g in G:
    print(g)
