# -*- coding: utf-8 -*-
"""大信薬局 擁壁工事 実行予算書（改3-2・地盤改良 亜細亜土質 6,000,000 ベース）
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
    ("【VE】割栗石を埋戻し・盛土に再利用（シート「VE案_割栗石」）", "=ROUND('VE案_割栗石'!D20,-4)", "=ROUND('VE案_割栗石'!E20,-4)", "処分代と購入土を相殺。標準＝岩60m³（地山）。建物の下・立上り際・電柱周りには使わない"),
    ("既存ブロック解体を実費に置き換え", 200000, 300000, "予算は外注500,000。自社で解体済みのため処分費＋手間の実費に"),
    ("地盤改良の本数減（交渉額に未反映の場合）", 0, 700000, "6,000,000に220本・電線下の約25本減が反映済みなら0。未反映なら追加減額を交渉"),
    ("【VE】解体ガラ（土間コン・ブロック）を小割りして場内で再利用（処分ゼロ）", 300000, 450000, "ガラ約29m³（ほぐし約44m³＝3t 22台）の処分費・運搬費を削減し、小割りの手間（ブレーカー約2日）を差し引き。擁壁裏の水はけ層・埋戻し下層・帯状部・仮設通路に使う（作業指示書No.4 第2版）。構造設計者の承認後"),
    ("【VE】残土を場内（帯状部・敷地の整地・外構の盛土）で使い、処理場行きを減らす", 230000, 460000, "処理場行き44台（約46万円）の半分～全部を場内で使う。施主の了承が必要。下段の土地（田）へ盛る場合は農地法・盛土規制の手続きを確認"),
    ("【VE】掘削の作業幅・法勾配を見直して掘削量を減らす（約20m³）", 90000, 150000, "敷地側の作業幅0.5→0.3m、法勾配1:0.5→1:0.3（地山の種類を確認、労働安全衛生規則の掘削勾配の範囲で）。掘削・埋戻し・仮置きが減る。電柱側は指示書No.2のとおり"),
    ("【VE】処理場の帰り便で砕石を積んで戻る", 30000, 50000, "処理場（中間処理施設）が再生砕石を販売していれば、基礎砕石・裏込め砕石の配送費を省ける"),
    ("【VE】残コンを場内で使う（捨てコン・仮設通路）", 10000, 30000, "打設日の残コンを持ち帰り処分せず、通路のぬかるみ対策などに使う"),
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
# ---------------- VE案：割栗石の再利用
g = wb.create_sheet("VE案_割栗石")
for c_, w_ in zip("ABCDEFG", (3, 40, 14, 14, 14, 4, 70)):
    g.column_dimensions[c_].width = w_
g["B1"] = "VE案：掘削で出る割栗石を埋戻し・盛土に再利用し、処分代と購入土を相殺する"; g["B1"].font = F(13, True)
g["B2"] = "社内限定。数量・単価は推定（青字は入力値）。構造設計者・現場責任者の確認後に実施。"; g["B2"].font = F(9, c="FF555555")
def gh(rr, cols_):
    for i_, h_ in enumerate(cols_):
        if h_:
            x_ = g.cell(rr, 2 + i_, h_); x_.font = F(9, True); x_.fill = HEAD; x_.border = B; x_.alignment = Alignment(horizontal="center", wrap_text=True)
def gl(rr, label, vals, note="", bold=False, inp=False, fmt=NUM):
    g.cell(rr, 2, label).font = F(10, bold); g.cell(rr, 2).border = B
    for i_, v_ in enumerate(vals):
        x_ = g.cell(rr, 3 + i_, v_); x_.number_format = fmt; x_.font = F(10, bold, INP if inp else "FF000000"); x_.border = B
    g.cell(rr, 7, note).font = F(9); g.cell(rr, 7).alignment = Alignment(wrap_text=True, vertical="center")
    g.row_dimensions[rr].height = 28 if len(note) > 45 else 18
gh(4, ("金額の効果", "楽観", "標準", "悲観", "", "根拠"))
gl(5, "掘削で出る岩（地山）m³", [30, 60, 100], "現場写真（11/12～13）からの想定。掘削初日に実測", inp=True, fmt="#,##0")
gl(6, "岩（ほぐし）m³", ["=C5*1.5", "=D5*1.5", "=E5*1.5"], "ほぐし率1.5", fmt="#,##0.0")
gl(7, "再利用できる上限（ほぐし）m³", [60, 60, 60], "使える場所（下表）の容量の目安。西・東面のヒール上の下層＋帯状部＋北側の嵩上げ", inp=True, fmt="#,##0")
gl(8, "再利用する量（ほぐし）m³", ["=MIN(C6,C7)", "=MIN(D6,D7)", "=MIN(E6,E7)"], "", fmt="#,##0.0")
gl(9, "処分する量（ほぐし）m³", ["=C6-C8", "=D6-D8", "=E6-E8"], "上限を超えた分は処理場へ", fmt="#,##0.0")
gl(10, "処分＋運搬の単価（円/m³ ほぐし）", [5167, 5167, 5167], "3tダンプ 5,000円/台・2.0m³/台＋2台×1台日30,000円（予算書の割栗石予備費と同じ条件）", inp=True)
gl(11, "購入土の単価（円/m³ ほぐし）", [4000, 4000, 4000], "岩の分だけ不足する埋戻し土を買う場合の単価（予算書の予備費と同じ）", inp=True)
gl(12, "再利用の手間（分別・小割り・敷均し）円/m³", [1500, 1500, 1500], "粒径300mm超の小割り・目潰し土の充填・層ごとの転圧の手間増（仮定）", inp=True)
gl(14, "VEなし：岩の処分費", ["=ROUND(C6*C10,0)", "=ROUND(D6*D10,0)", "=ROUND(E6*E10,0)"], "全量を処理場へ")
gl(15, "VEなし：岩の分の購入土", ["=ROUND(C6/1.5*1.2*C11,0)", "=ROUND(D6/1.5*1.2*D11,0)", "=ROUND(E6/1.5*1.2*E11,0)"], "岩（地山）を土（ほぐし1.2）で埋め戻す分")
gl(16, "VEあり：残りの処分費", ["=ROUND(C9*C10,0)", "=ROUND(D9*D10,0)", "=ROUND(E9*E10,0)"], "")
gl(17, "VEあり：残りの購入土", ["=ROUND(C9/1.5*1.2*C11,0)", "=ROUND(D9/1.5*1.2*D11,0)", "=ROUND(E9/1.5*1.2*E11,0)"], "")
gl(18, "VEあり：再利用の手間", ["=ROUND(C8*C12,0)", "=ROUND(D8*D12,0)", "=ROUND(E8*E12,0)"], "")
gl(20, "VEによる削減額", ["=C14+C15-C16-C17-C18", "=D14+D15-D16-D17-D18", "=E14+E15-E16-E17-E18"], "処分代と購入土の相殺 − 手間増", bold=True)
rr = 22
gh(rr, ("使える場所・使えない場所", "", "", "", "", "理由・条件")); rr += 1
for a_, b_ in [
    ("○ 西面・東面のヒール上の下層（底盤天 -1400 ～ -800）", "立上りから0.8m以上（裏込め砕石0.3m＋0.5m）離す。補強梁（S-07）の上と周り0.3mは除く。上の60cmは良質土"),
    ("○ 帯状部（旧西面～新西面）の盛土", "擁壁の外側で構造に影響しない。電柱・支柱の周り1.0mは除く"),
    ("○ 北側の前面嵩上げ（±0-1500まで）の下層", "根固め・洗掘防止として有効。上面は土で覆う"),
    ("× 北面ヒール上（建物の下になる範囲）", "申請建物の基礎と重なる。不同沈下を避けるため良質土のみで締め固める"),
    ("× 立上り・裏込め砕石・水抜き穴の周り", "点荷重・空隙で立上りや吸出し防止材を傷める"),
    ("× 地表から60cm以内（外構・駐車場の路盤の下）", "仕上げ面の沈下・不陸の原因になる"),
    ("× 柱状改良の範囲に残す", "亜細亜の条件「レキ・ガラは金額変更」。改良範囲の岩は掘削時に取り除く"),
]:
    g.cell(rr, 2, a_).font = F(9, True); g.cell(rr, 7, b_).font = F(9)
    g.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=6)
    for c in (2, 7):
        g.cell(rr, c).border = B; g.cell(rr, c).alignment = Alignment(wrap_text=True, vertical="center")
    g.row_dimensions[rr].height = 28
    rr += 1
rr += 1
gh(rr, ("施工方法・品質管理", "", "", "", "", "")); rr += 1
for t_ in ["1. 掘削時に岩と土を分別して、下段の土地に別々に仮置きする（岩の量を毎日記録）",
           "2. 粒径300mmを超える岩はバケットで小割りするか処分へ回す",
           "3. 1層30cm以下で敷き均し、岩の隙間を土で目潰ししながらプレート・ランマで締め固める（岩が土に浮く状態にする）",
           "4. 岩混じり層の上60cmは良質土のみ。層ごとに転圧状況を写真で記録する",
           "5. 擁壁の背面は岩混じりでも単位体積重量・内部摩擦角は同等以上で、土圧は増えない見込み。構造設計者への確認事項に追加する"]:
    g.cell(rr, 2, t_).font = F(9); g.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=7); rr += 1
g.page_setup.orientation = "landscape"; g.page_setup.fitToWidth = 1; g.page_setup.fitToHeight = 0; g.sheet_properties.pageSetUpPr.fitToPage = True
wb.active = 0
wb.save(OUT)
print("total row", RT, "summary", S0)
