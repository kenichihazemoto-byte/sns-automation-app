# たいよう様 1階テナント1 3D下絵（平面詳細図 10/15 準拠）  単位mm 原点=い通り/0通り
import math, sys
import numpy as np
from PIL import Image, ImageDraw
W,H=1376,768
CAM=(float(sys.argv[1]) if len(sys.argv)>1 else 250, 2730, 1500)
YAW=math.radians(float(sys.argv[2]) if len(sys.argv)>2 else 8)
HFOV=math.radians(78); F=(W/2)/math.tan(HFOV/2)
OUT=sys.argv[3] if len(sys.argv)>3 else "docs/taiyo-perse/v2_tables4/shitae_G.png"
boxes=[]
def box(x0,x1,y0,y1,z0,z1,c): boxes.append((x0,x1,y0,y1,z0,z1,c))
WALL=(236,234,228); WOOD=(176,128,80); BLK=(45,45,48); SOFA=(80,60,50); FLOOR=(150,150,150)
CH=2400
# 床・天井
box(0,9000,0,5915,-20,0,FLOOR); box(0,9000,0,5915,CH,CH+20,(245,245,242))
# 外周壁
box(-100,9000,5860,5960,0,CH,WALL)     # 北壁
box(0,9000,-100,0,0,CH,WALL)           # 南壁
box(8850,8950,0,5915,0,CH,(225,222,215)) # 奥の壁(テナント境)
# 柱型・壁
box(3577,3704,4937,5860,0,CH,WALL)     # ほ通り 北側の壁(PS)
box(5397,5524,4937,5860,0,CH,WALL)     # と通り 北側の壁
box(5397,5524,0,2334,0,CH,WALL)        # と通り 南側の壁(テレビ壁)
box(5524,5540,300,2100,1200,1900,(20,20,22)) # TV(東面=カウンター向き)
box(3577,3704,0,2334,0,CH,WALL)        # ほ通り 階段の壁
box(0,3704,1365,2313,0,CH,WALL)        # トイレの箱
box(1300,2650,2313,2333,1350,2050,(20,20,22)) # 壁付TV(トイレ北面)
box(2300,2560,2313,2440,750,900,(250,250,250)) # 手洗い器ミラタップ
# トイレ扉(北面)
box(500,1250,2313,2318,0,2000,(110,80,55)); box(2000,2750,2313,2318,0,2000,(110,80,55))
# ソファー(北壁沿い い〜ほ)
box(100,3570,5356,5860,0,420,SOFA); box(100,3570,5650,5860,420,850,SOFA)
# テーブル(一重線) 4台
def table(x0,x1,y0,y1):
    box(x0,x1,y0,y1,700,730,WOOD)
    cx=(x0+x1)/2; cy=(y0+y1)/2; box(cx-40,cx+40,cy-40,cy+40,0,700,BLK)
table(267,1473,4302,5001); table(2167,3374,4302,5001); table(4136,5342,4302,5001)
table(4136,5342,916,1615)
# ベンチ(二重線)
def bench(x0,x1,y0,y1,back=None):
    box(x0,x1,y0,y1,0,420,BLK)
    if back=='n': box(x0,x1,y1-120,y1,420,800,BLK)
    if back=='s': box(x0,x1,y0,y0+120,420,800,BLK)
bench(267,1473,3456,4057); bench(2167,3374,3456,4057); bench(4136,5342,3456,4057)
bench(4136,5342,5234,5826,'n')
bench(4136,5342,1847,2448); bench(4136,5342,69,662,'s')
# カウンター(と〜ち) スツール7脚
box(6600,7300,300,4900,0,1000,(40,40,42)); box(6520,7300,300,4900,1000,1050,WOOD)
for y in (4584,3901,3219,2537,1820,1115,432):
    box(6200,6540,y-170,y+170,0,700,(150,110,70))
# 奥の壁のボトル棚
box(8500,8850,700,4700,0,900,(60,45,35)); box(8550,8850,700,4700,900,2300,(200,150,80))
# ---- 描画 ----
cx,cy,cz=CAM; fx,fy=math.cos(YAW),math.sin(YAW); rx,ry=fy,-fx
def tocam(p):
    dx,dy,dz=p[0]-cx,p[1]-cy,p[2]-cz
    return (dx*rx+dy*ry, dz, dx*fx+dy*fy)
def clip(poly,near=60):
    out=[]
    for i in range(len(poly)):
        a=poly[i]; b=poly[(i+1)%len(poly)]
        ai=a[2]>=near; bi=b[2]>=near
        if ai: out.append(a)
        if ai!=bi:
            t=(near-a[2])/(b[2]-a[2]); out.append(tuple(a[k]+t*(b[k]-a[k]) for k in range(3)))
    return out
faces=[]
for (x0,x1,y0,y1,z0,z1,c) in boxes:
    V=lambda x,y,z:(x,y,z)
    fs=[([V(x0,y0,z0),V(x1,y0,z0),V(x1,y0,z1),V(x0,y0,z1)],(0,-1,0)),
        ([V(x0,y1,z0),V(x1,y1,z0),V(x1,y1,z1),V(x0,y1,z1)],(0,1,0)),
        ([V(x0,y0,z0),V(x0,y1,z0),V(x0,y1,z1),V(x0,y0,z1)],(-1,0,0)),
        ([V(x1,y0,z0),V(x1,y1,z0),V(x1,y1,z1),V(x1,y0,z1)],(1,0,0)),
        ([V(x0,y0,z0),V(x1,y0,z0),V(x1,y1,z0),V(x0,y1,z0)],(0,0,-1)),
        ([V(x0,y0,z1),V(x1,y0,z1),V(x1,y1,z1),V(x0,y1,z1)],(0,0,1))]
    for pts,n in fs:
        ctr=[sum(p[k] for p in pts)/4 for k in range(3)]
        if (ctr[0]-cx)*n[0]+(ctr[1]-cy)*n[1]+(ctr[2]-cz)*n[2]>=0: continue
        shade={(0,0,1):1.0,(0,0,-1):0.75,(1,0,0):0.85,(-1,0,0):0.92,(0,1,0):0.8,(0,-1,0):0.95}[n]
        col=tuple(int(v*shade) for v in c)
        cp=clip([tocam(p) for p in pts])
        if len(cp)<3: continue
        # 面の最も近い点までの距離で並べる
        d=min(math.dist((cx,cy,cz),p) for p in pts)
        d=math.dist((cx,cy,cz),ctr)
        c3=[tocam(p) for p in pts]
        a,b,c_=c3[0],c3[1],c3[3]
        nn=np.cross(np.subtract(b,a),np.subtract(c_,a)); kk=float(np.dot(nn,a))
        faces.append((d,[(W/2+F*p[0]/p[2],H/2-F*p[1]/p[2]) for p in cp],col,(nn,kk)))
import numpy as np
from PIL import Image as I2
zb=np.full((H,W),1e12); img=np.full((H,W,3),255,np.uint8)
for (d,poly,col,pl) in faces:
    m=I2.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255,outline=255)
    mk=np.array(m)>0
    ys,xs=np.nonzero(mk)
    if len(xs)==0: continue
    u=(xs-W/2)/F; v=-(ys-H/2)/F
    n,k=pl; den=n[0]*u+n[1]*v+n[2]
    with np.errstate(divide='ignore',invalid='ignore'):
        z=np.where(np.abs(den)>1e-9,k/den,1e12)
    z=np.where(z>0,z,1e12)-0.5
    ok=z<zb[ys,xs]
    zb[ys[ok],xs[ok]]=z[ok]; img[ys[ok],xs[ok]]=col
im=I2.fromarray(img)
# 輪郭線
e=np.zeros((H,W),bool); lz=np.log(zb)
e[:,1:]|=np.abs(np.diff(lz,axis=1))>0.02; e[1:,:]|=np.abs(np.diff(lz,axis=0))>0.02
a=np.array(im); a[e]=(80,80,80); im=I2.fromarray(a)
im.save(OUT); print(OUT)
