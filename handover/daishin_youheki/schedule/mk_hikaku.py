# -*- coding: utf-8 -*-
"""擁壁工事 数量・金額 比較表（見積書10/20・予算書11/3 と 改3-1 数量計算）"""
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL

QTY_XLSX, OUT = sys.argv[1], sys.argv[2]
Q = {}
qs = openpyxl.load_workbook(QTY_XLSX, data_only=True)["数量計算"]
for r in qs.iter_rows(min_row=4):
    if r[1].value and isinstance(r[2].value, (int, float)):
        Q[r[1].value] = r[2].value
q = lambda name: round(Q[name], 2)

FN = "ＭＳ Ｐゴシック"
F = lambda sz=10, b=False, c="FF000000": Font(name=FN, size=sz, bold=b, color=c)
th = Side(style="thin", color="FF999999"); B = Border(left=th, right=th, top=th, bottom=th)
HEAD = PatternFill("solid", fgColor="FFE7E6E6"); SEC = PatternFill("solid", fgColor="FFDDEBF7")
NEWF = PatternFill("solid", fgColor="FFFFF2CC"); INP = "FF0000FF"
MARGIN = 0.70   # 見積に無い追加項目の売価＝原価÷0.70（既存見積の利益率 約30%に合わせた仮定）

# ---- 行データ：(工種, 品名, 単位, 見積数量, 見積単価, 予算単価, 改3-1数量 or None, 根拠, 区分)
#  区分: "qty"＝数量差で精算 / "new"＝見積に無い追加 / "same"＝変更なし / "tbd"＝未確定
ROWS = [
    ("仮設工事", "運搬費", "回", 6, 50000, 35000, 6, "変更なし（型枠の運搬費と二重の可能性あり：予算書注記）", "same"),
    ("仮設工事", "産廃処分費", "式", 1, 71500, 50000, 1, "変更なし", "same"),
    ("仮設工事", "交通費", "式", 1, 100000, 70000, 1, "変更なし", "same"),
    ("土工事", "重機回送費", "式", 1, 114300, 80000, 1, "変更なし", "same"),
    ("土工事", "根切工事", "m³", 77.44, 1850, 1300, q("掘削土量 合計（地山）"),
     "数量計算4：敷地側（底面119.7＋上端144.3）÷2×深さ2.10＋外側作業帯。見積は掘削幅・深さの拾い不足", "qty"),
    ("土工事", "埋戻し", "m³", 12.00, 4000, 2800, q("埋戻し・盛土 合計（締固め後）"),
     "数量計算5：掘削−構造物等＋北側嵩上げ盛土。ヤード仮置き土を再利用", "qty"),
    ("土工事", "砕石地業 t100", "m²", 110.00, 1300, 1000, round(Q["底盤面積"] * 1.05, 2), "底盤面積106.15×1.05（敷地側100出し）", "qty"),
    ("土工事", "残土運搬・処理", "m³", 65.50, 25800, 22000, q("残土 処分量（ほぐし）"),
     "数量計算5：残土（地山）72.1×L1.2。処分場へ直送", "qty"),
    ("コンクリート工事", "捨てコン Fc18", "m³", 6.60, 32150, 22500, q("捨てコン（均しコン）t50"), "底盤面積×1.05×0.05", "qty"),
    ("コンクリート工事", "ベースコンクリート Fc21", "m³", 68.12, 32900, 23050, round(Q["底盤 Fc21"] + Q["補強梁 上がり部 Fc21"], 2),
     "底盤53.08＋補強梁1.50（S-07）。見積は×1.15の余裕込みとみられる", "qty"),
    ("コンクリート工事", "立ち上りコンクリート Fc21", "m³", 21.00, 32900, 23050, q("立上り Fc21（ハンチ含む）"), "（立上り平面積＋ハンチ）×1.6", "qty"),
    ("コンクリート工事", "コンクリート打設費", "m³", 89.12, 10150, 7100, q("生コン 合計"), "捨てコン＋底盤打設＋立上り＋止水コン（ふかしコン含む）", "qty"),
    ("コンクリート工事", "天端金鏝仕上げ", "m", 46.00, 1000, 700, 42.48, "擁壁延長（改3-1：北面3m短縮）", "qty"),
    ("コンクリート工事", "水抜き穴 75φ", "個", 45.00, 1450, 1000, 30, "S-01 改3-1 は30か所。型枠工事の水抜きパイプと二重計上の可能性", "qty"),
    ("鉄筋工事", "異形鉄筋 SD295A D10", "t", 0.13, 188700, 132000, 0.012, "S-05 改3-1：巾止め筋W4 約12kg", "qty"),
    ("鉄筋工事", "異形鉄筋 SD295A D13", "t", 3.53, 184400, 129000, 3.395, "S-05 改3-1：合計3.58tからD19・D10を除く", "qty"),
    ("鉄筋工事", "異形鉄筋 SD345 D19（無改良区間 補強）", "t", 0, 0, 0, 0.173, "S-07 補強筋 R1・R2・R3（33＋49＋91kg）。見積に無い", "new_rb"),
    ("鉄筋工事", "組立手間費", "t", 3.66, 95800, 67000, 3.58, "鉄筋合計（S-05 改3-1）", "qty"),
    ("鉄筋工事", "加工費", "t", 3.66, 28600, 20000, 3.58, "同上", "qty"),
    ("鉄筋工事", "運搬費", "回", 1, 48600, 34000, 1, "変更なし", "same"),
    ("鉄筋工事", "副資材費", "t", 3.66, 10000, 7000, 3.58, "同上", "qty"),
    ("型枠工事", "ベース型枠 表面 H=500", "m", 46.00, 7100, 5000, 42.48, "擁壁外面延長", "qty"),
    ("型枠工事", "ベース型枠 裏面 H=500", "m", 40.00, 7100, 5000, 28.29, "底盤内側（ヒール端）延長。改3-1形状から算出", "qty"),
    ("型枠工事", "立ち上り擁壁型枠 外部化粧枠", "m²", 73.00, 7800, 5500, round(42.48 * 1.6, 2), "外面延長42.48×1.6", "qty"),
    ("型枠工事", "立ち上り擁壁型枠 内枠普通型枠", "m²", 73.00, 6400, 4500, round(41.30 * 1.6, 2), "内面延長41.30×1.6", "qty"),
    ("型枠工事", "水抜きパイプΦ75", "箇所", 28.00, 2800, 2000, 30, "S-01 改3-1", "qty"),
    ("型枠工事", "面木", "m", 100.00, 800, 600, 92, "S-05 改3-1（天端両角＋端部・出隅）", "qty"),
    ("型枠工事", "運搬費", "回", 6, 50000, 35000, 6, "変更なし（仮設工事の運搬費と二重の可能性：予算書注記）", "same"),
]
# 見積に無い追加項目（原価＝予算書「予算外の見込み」等の推定単価、売価＝原価÷0.70）
NEW = [
    ("土工事", "掘削土 ヤード運搬（往復）", "台日", 36, 40000, "4tダンプ 3台×（根切7日＋埋戻し5日）。1台日40,000円（運転手込み・推定）。現場→ヤード109台・ヤード→現場109台"),
    ("土工事", "ヤード 積込み（埋戻し時）", "日", 5, 50000, "ヤードでの積込み重機＋オペ（推定）"),
    ("土工事", "前面（北側）嵩上げ盛土", "m³", round(Q["前面（北側）嵩上げ盛土（締固め後）"], 2), 2800, "予算書の埋戻し単価"),
    ("土工事", "裏込め砕石", "m³", round(Q["裏込め砕石 W300（単粒度）"], 2), 10000, "予算書「予算外の見込み」の単価"),
    ("土工事", "電柱側 土留め（軽量鋼矢板 約6m）", "式", 1, 250000, "仮定値。打込み・引抜き・損料（S-06）"),
    ("解体工事", "既存ブロック解体（基礎共）約45m", "式", 1, 500000, "予算書推定 300,000～700,000 の中央"),
    ("解体工事", "アスファルト撤去・As殻処分", "m²", 166, 1500, "掘削範囲166m²。単価は仮定値"),
    ("コンクリート工事", "前面ふかしコン Fc18（材料）", "m³", round(Q["前面ふかしコン 無筋 Fc18"], 2), 22500, "予算書の捨てコン単価（Fc18）。打設費は打設費の行に含む"),
    ("コンクリート工事", "止水コンクリート", "式", 1, 55000, "予算書「予算外の見込み」"),
    ("型枠工事", "前面ふかし・補強梁 型枠", "m²", round(12 + 6.2, 1), 4500, "ふかし外枠12m²（予算書）＋補強梁6.2m²（S-05）"),
    ("型枠工事", "吸出し防止材", "箇所", 30, 500, "予算書「予算外の見込み」"),
    ("型枠工事", "目地棒・エラスタイト・シーリング", "式", 1, 50450, "予算書「予算外の見込み」"),
    ("土工事", "改良発生土 処分", "m³", round(Q["改良発生土 処分量（ほぐし）"], 2), 22000, "発生率15%仮定。亜細亜は場内処理条件、場外なら元請手配（予算書）"),
]

wb = openpyxl.Workbook(); ws = wb.active; ws.title = "比較表"
cols = [("工種", 13), ("品名・規格", 30), ("単位", 6), ("見積数量", 9), ("改3-1数量", 9), ("数量差", 9),
        ("見積単価", 10), ("予算単価", 10), ("見積額", 12), ("改3-1 見積額", 12), ("見積の増減", 12),
        ("予算額", 12), ("改3-1 原価", 12), ("原価の増減", 12), ("区分", 8), ("根拠・備考", 60)]
for i, (h, w) in enumerate(cols, 1):
    ws.column_dimensions[CL(i)].width = w
ws["A1"] = "大信薬局（可也病院 調剤薬局建築予定地）擁壁工事　数量・金額 比較表"; ws["A1"].font = F(14, True)
ws["A2"] = ("比較：見積書 No.900328-00（2026/10/20、税抜18,409,091）／予算書＝予算・発注管理表（11/3版）／改3-1＝擁壁施工図 改3-1 の数量計算（11/14）。"
            "社内限定・原価入り（お客様提出不可）")
ws["A2"].font = F(9, c="FF555555")
ws["A3"] = f"青字＝入力値。見積に無い追加項目の売価は「原価 ÷ {MARGIN:.2f}」（既存見積の利益率約30%に合わせた仮定）。"; ws["A3"].font = F(9, c="FF555555")
hr = 5
for i, (h, _) in enumerate(cols, 1):
    x = ws.cell(hr, i, h); x.font = F(9, True); x.fill = HEAD; x.border = B; x.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[hr].height = 28
ws.cell(hr - 1, 9, "売価（お客様への見積）").font = F(9, True); ws.cell(hr - 1, 12, "原価（予算）").font = F(9, True)

r = hr + 1
first = r
def put_row(kind, kos, name, unit, qe, pe, pb, qn, note):
    global r
    vals = [kos, name, unit, qe, qn]
    for i, v in enumerate(vals, 1):
        ws.cell(r, i, v)
    ws.cell(r, 6, f"=E{r}-D{r}")
    ws.cell(r, 7, pe); ws.cell(r, 8, pb)
    ws.cell(r, 9, f"=ROUND(D{r}*G{r},0)"); ws.cell(r, 10, f"=ROUND(E{r}*G{r},0)"); ws.cell(r, 11, f"=J{r}-I{r}")
    ws.cell(r, 12, f"=ROUND(D{r}*H{r},0)"); ws.cell(r, 13, f"=ROUND(E{r}*H{r},0)"); ws.cell(r, 14, f"=M{r}-L{r}")
    ws.cell(r, 15, {"qty": "数量精算", "same": "変更なし", "new": "追加", "new_rb": "追加"}[kind]); ws.cell(r, 16, note)
    for c in range(1, 17):
        x = ws.cell(r, c); x.border = B; x.font = F(9)
        x.alignment = Alignment(vertical="center", wrap_text=(c == 16))
        if c in (4, 5, 6):
            x.number_format = "#,##0.00"
        elif c >= 7 and c <= 14:
            x.number_format = "#,##0;[Red]-#,##0"
    for c in (4, 5, 7, 8):
        ws.cell(r, c).font = F(9, c=INP)
    if kind.startswith("new"):
        for c in range(1, 17):
            ws.cell(r, c).fill = NEWF
    ws.row_dimensions[r].height = 26
    r += 1

for kos, name, unit, qe, pe, pb, qn, note, kind in ROWS:
    if kind == "new_rb":     # D19：売価は原価÷0.7、原価は D13 予算単価＋SD345割増 約5,000円/t（仮定）
        pb_ = 129000 + 5000; pe_ = round(pb_ / MARGIN, -2)
        put_row("new", kos, name, unit, 0, pe_, pb_, qn, note + "。原価単価はD13予算＋SD345割増5,000円/t（仮定）")
    else:
        put_row(kind, kos, name, unit, qe, pe, pb, qn, note)
mid = r
for kos, name, unit, qn, pb, note in NEW:
    put_row("new", kos, name, unit, 0, round(pb / MARGIN, 0), pb, qn, note)
last = r - 1

# 合計
r += 1
def tot(label, rng_from, rng_to, fill=None, bold=True):
    global r
    ws.cell(r, 2, label).font = F(10, bold)
    for c in (9, 10, 11, 12, 13, 14):
        x = ws.cell(r, c, f"=SUM({CL(c)}{rng_from}:{CL(c)}{rng_to})"); x.number_format = "#,##0;[Red]-#,##0"; x.font = F(10, bold); x.border = B
        if fill: x.fill = fill
    r += 1
    return r - 1
r_a = tot("A. 見積にある項目（数量の差）", first, mid - 1)
r_b = tot("B. 見積に無い追加項目（推定）", mid, last, NEWF)
r_ab = r
ws.cell(r, 2, "A＋B 合計").font = F(11, True)
for c in (9, 10, 11, 12, 13, 14):
    x = ws.cell(r, c, f"={CL(c)}{r_a}+{CL(c)}{r_b}"); x.number_format = "#,##0;[Red]-#,##0"; x.font = F(11, True); x.border = B
r += 2

# サマリー（見積全体への影響）
ws.cell(r, 2, "見積全体への影響（税抜）").font = F(12, True); r += 1
S0 = r
items = [
    ("現在の見積（10/20版）", "=18409091", "見積書の税抜金額"),
    ("擁壁地盤改良工事（見積7,500,000）", "=0", "改良業者の再見積待ちのため、ここでは増減0。下の「未確定」を参照"),
    ("A. 数量差による見積の増減", f"=K{r_a}", "見積単価で精算した場合"),
    ("B. 追加項目の見積額", f"=K{r_b}", f"原価÷{MARGIN:.2f}"),
    ("増減 合計（A＋B）", f"=K{r_ab}", ""),
    ("改3-1 反映後の見積（見込み）", f"=C{S0}+C{S0+4}", "現場管理費・一般管理費は据え置き"),
    ("原価の増減（A＋B）", f"=N{r_ab}", "予算単価で計算"),
    ("粗利の増減", f"=C{S0+4}-C{S0+6}", "見積の増減 − 原価の増減"),
]
for i, (a, f, n) in enumerate(items):
    ws.cell(r, 2, a).font = F(10, i in (4, 5, 7)); x = ws.cell(r, 3, f); x.number_format = "#,##0;[Red]-#,##0"; x.font = F(10, i in (4, 5, 7))
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=5)
    ws.cell(r, 6, n).font = F(9, c="FF555555")
    for c in (2, 3): ws.cell(r, c).border = B
    r += 1
r += 1
ws.cell(r, 2, "未確定（金額に入れていない）").font = F(12, True); r += 1
for a, n in [
    ("擁壁地盤改良：本数の減", "杭伏図220本（見積は亜細亜238本の前提）。さらに電線下（西面NW隅から0.7～5.0m）の約25本を打設しない（推定）。改良業者の再見積で減額の見込み"),
    ("擁壁地盤改良：発注先", "サムシング（NET 6,750,000、発生土146.7m³は別途）か亜細亜（NET 7,500,000、発生土は場内処理）か。予算書「改良の比較」参照"),
    ("電柱・電線", "電柱移設は不要になった（擁壁を移動）。九電の防護管・立会費用の有無は未確認"),
    ("S-07 補強", "構造設計者の確認で補強量が変わる可能性"),
    ("土質", "土量変化率（L1.2・C0.9）を仮定。粘性土なら残土・埋戻し量が変わる"),
]:
    ws.cell(r, 2, a).font = F(9, True); ws.cell(r, 3, n).font = F(9)
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=16)
    r += 1
ws.freeze_panes = "C6"
ws.page_setup.orientation = "landscape"; ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
wb.save(OUT)
print("rows", first, mid, last, "summary", S0)
