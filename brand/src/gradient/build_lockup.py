import json, math, numpy as np, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.basePen import BasePen
OUT=sys.argv[1]
M=json.load(open("mark.json")); pts=np.load("check_pts.npy")
CX,CY,R,SW,GAP=M["CX"],M["CY"],M["R"],M["SW"],M["GAP"]; D=M["check"]; S=M["stops"]; G=M["G"]
TOP=CY-R-SW/2; BASE=CY+R+SW/2          # ring outer top and bottom
f=instancer.instantiateVariableFont(TTFont("/tmp/fonts2/Outfit.ttf"),{"wght":500})
gs,cm,hm=f.getGlyphSet(),f.getBestCmap(),f["hmtx"]
bp=BoundsPen(gs); gs[cm[ord("h")]].draw(bp); SC=(BASE-TOP)/bp.bounds[3]
class Sampler(BasePen):
    def __init__(s,gs): super().__init__(gs); s.p=[]; s.c=(0,0)
    def _moveTo(s,p): s.c=p; s.p.append(p)
    def _lineTo(s,p):
        a=s.c
        for i in range(1,11): t=i/10; s.p.append((a[0]+(p[0]-a[0])*t,a[1]+(p[1]-a[1])*t))
        s.c=p
    def _curveToOne(s,p1,p2,p3):
        a=s.c
        for i in range(1,21):
            t=i/20; m=1-t; s.p.append((m**3*a[0]+3*m*m*t*p1[0]+3*m*t*t*p2[0]+t**3*p3[0],m**3*a[1]+3*m*m*t*p1[1]+3*m*t*t*p2[1]+t**3*p3[1]))
        s.c=p3
    def _qCurveToOne(s,p1,p2):
        a=s.c
        for i in range(1,21):
            t=i/20; m=1-t; s.p.append((m*m*a[0]+2*m*t*p1[0]+t*t*p2[0],m*m*a[1]+2*m*t*p1[1]+t*t*p2[1]))
        s.c=p2
sp=Sampler(gs); gs[cm[ord("o")]].draw(sp)
O=np.array([(x*SC,BASE-y*SC) for x,y in sp.p])
A,B=pts,np.roll(pts,-1,axis=0)
def dist_to_poly(P):
    AB=B-A; L=(AB**2).sum(1); out=np.full(len(P),1e9)
    for i in range(len(A)):
        if L[i]<1e-9: continue
        t=np.clip(((P-A[i])@AB[i])/L[i],0,1); Q=A[i]+t[:,None]*AB[i]; out=np.minimum(out,np.hypot(*(P-Q).T))
    return out
GAP_TEXT=0.36*SW          # gap as a share of the stroke, as in the flat logo
def clearance(x0): return dist_to_poly(O+np.array([x0,0])).min()
lo,hi=0.0,1200.0
for _ in range(60):
    mid=(lo+hi)/2; lo,hi=(mid,hi) if clearance(mid)<GAP_TEXT else (lo,mid)
X0=hi
def word(text,x0):
    d,x="",x0
    for ch in text:
        g=cm[ord(ch)]; p=SVGPathPen(gs,ntos=lambda v:f"{v:.1f}")
        gs[g].draw(TransformPen(p,(SC,0,0,-SC,x,BASE))); d+=p.getCommands(); x+=hm[g][0]*SC
    return d,x
WD,END=word("ohesion",X0)
def lg(i,g,s): return (f'<linearGradient id="{i}" gradientUnits="userSpaceOnUse" x1="{g["p0"][0]:.1f}" y1="{g["p0"][1]:.1f}" x2="{g["p1"][0]:.1f}" y2="{g["p1"][1]:.1f}">'+"".join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in s)+'</linearGradient>')
def mark(u="q"):
    return (f'<defs>{lg(u+"r",G["ring"],S["ring"])}{lg(u+"c",G["check"],S["check"])}'
            f'<mask id="{u}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><path d="{D}" fill="#000" stroke="#000" stroke-width="{2*GAP}" stroke-linejoin="round"/></mask></defs>'
            f'<circle cx="{CX}" cy="{CY}" r="{R:.2f}" fill="none" stroke="url(#{u}r)" stroke-width="{SW:.2f}" mask="url(#{u}m)"/>'
            f'<path d="{D}" fill="url(#{u}c)"/>')
PAD=26
x0=CX-R-SW/2-PAD; y0=TOP-PAD; wm=959+PAD-x0; hh=BASE-TOP+2*PAD
MV=f"{x0:.0f} {y0:.0f} {wm:.0f} {hh:.0f}"; LV=f"{x0:.0f} {y0:.0f} {END+PAD-x0:.0f} {hh:.0f}"
def svg(vb,body,extra=""): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Qohesion"{extra}><title>Qohesion</title>{body}</svg>\n'
INK,PAPER,NAVY="#0F224C","#EAF2FF","#0F224C"
files={
 "qohesion-mark-gradient.svg": svg(MV,mark()),
 "qohesion-logo-gradient.svg": svg(LV,mark()+f'<path d="{WD}" fill="{INK}"/>'),
 "qohesion-logo-gradient-dark.svg": svg(LV,mark()+f'<path d="{WD}" fill="{PAPER}"/>'),
}
# plate: navy rounded rectangle behind the dark lockup, readable on any page
vx,vy,vw,vh=[float(v) for v in LV.split()]; PX,PY=150,105
files["qohesion-logo-gradient-plate.svg"]=svg(f"{vx-PX:.0f} {vy-PY:.0f} {vw+2*PX:.0f} {vh+2*PY:.0f}",f'<rect x="{vx-PX:.0f}" y="{vy-PY:.0f}" width="{vw+2*PX:.0f}" height="{vh+2*PY:.0f}" rx="72" fill="{NAVY}"/>'+mark()+f'<path d="{WD}" fill="{PAPER}"/>')
for n,s in files.items(): open(f"{OUT}/{n}","w").write(s)
print("scale %.4f text x0 %.1f end %.1f | clearance %.1f (target %.1f) | lockup viewBox %s | mark viewBox %s"%(SC,X0,END,clearance(X0),GAP_TEXT,LV,MV))
