import numpy as np, cv2, json
from PIL import Image
src="/Volumes/LKVM2026-8T/SOLAV/Projects/2027 — Qohesion/brand/logo/Enlarge_logo_and_fill_color_f8798a90.jpg"
im=np.array(Image.open(src).convert("RGB")).astype(np.uint8)
bg=np.array([15,34,76.]); d=np.linalg.norm(im.astype(float)-bg,axis=2)
hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV); h=hsv[...,0]*2.0
fg=(d>45); check=(fg&(h<177)).astype(np.uint8); ring=(fg&(h>=177)).astype(np.uint8)
def largest(m):
    n,lab,st,_=cv2.connectedComponentsWithStats(m,8); k=1+np.argmax(st[1:,4]); return (lab==k).astype(np.uint8)
check=cv2.erode(largest(check),np.ones((7,7),np.uint8)); ring=cv2.erode(largest(ring),np.ones((7,7),np.uint8))
G=json.load(open("grad.json")); pts=np.load("check_pts.npy")
def stops(mask,g):
    p0,p1=np.array(g["p0"]),np.array(g["p1"]); u=(p1-p0)/np.linalg.norm(p1-p0)
    ys,xs=np.nonzero(mask); t=((xs-p0[0])*u[0]+(ys-p0[1])*u[1])/np.linalg.norm(p1-p0)
    out=[]
    for lo,hi,off in ((0,.06,0),(.47,.53,.5),(.94,1,1)):
        sel=(t>=lo)&(t<=hi); c=np.median(im[ys[sel],xs[sel]],axis=0).astype(int); out.append((off,"#%02X%02X%02X"%tuple(c)))
    return out
S={"ring":stops(ring,G["ring"]),"check":stops(check,G["check"])}
print(S)
CX,CY,RO,RI=511.5,511.3,323.6,224.9; R=(RO+RI)/2; SW=RO-RI; GAP=28
d_check=json.load(open("mark.json"))["check"]
def lg(i,g,s):
    return (f'<linearGradient id="{i}" gradientUnits="userSpaceOnUse" x1="{g["p0"][0]:.1f}" y1="{g["p0"][1]:.1f}" x2="{g["p1"][0]:.1f}" y2="{g["p1"][1]:.1f}">'
            +"".join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in s)+'</linearGradient>')
def body(uid):
    return (f'<defs>{lg(uid+"r",G["ring"],S["ring"])}{lg(uid+"c",G["check"],S["check"])}'
            f'<mask id="{uid}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/>'
            f'<path d="{d_check}" fill="#000" stroke="#000" stroke-width="{2*GAP}" stroke-linejoin="round"/></mask></defs>'
            f'<circle cx="{CX}" cy="{CY}" r="{R:.2f}" fill="none" stroke="url(#{uid}r)" stroke-width="{SW:.2f}" mask="url(#{uid}m)"/>'
            f'<path d="{d_check}" fill="url(#{uid}c)"/>')
json.dump({"CX":CX,"CY":CY,"R":R,"SW":SW,"GAP":GAP,"check":d_check,"stops":S,"G":{k:{kk:(list(map(float,vv)) if kk in("p0","p1") else vv) for kk,vv in v.items()} for k,v in G.items()}},open("mark.json","w"))
open("mark_full.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{body("a")}</svg>')
print("ring R=%.2f SW=%.2f"%(R,SW))
