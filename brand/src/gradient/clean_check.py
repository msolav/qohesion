import numpy as np, cv2, json
from PIL import Image
from skimage import measure
src="/Volumes/LKVM2026-8T/SOLAV/Projects/2027 — Qohesion/brand/logo/Enlarge_logo_and_fill_color_f8798a90.jpg"
im=np.array(Image.open(src).convert("RGB")).astype(np.uint8)
bg=np.array([15,34,76.]); d=np.linalg.norm(im.astype(float)-bg,axis=2)
h=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)[...,0]*2.0
check=((d>45)&(h<177)).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(check,8); check=(lab==1+np.argmax(st[1:,4])).astype(np.uint8)
soft=cv2.GaussianBlur(check.astype(np.float32),(0,0),1.0)
c=max(measure.find_contours(soft,0.5),key=len); P=np.c_[c[:,1],c[:,0]]
if np.allclose(P[0],P[-1]): P=P[:-1]
def near(pt,r): return P[np.hypot(*(P-pt).T)<r]
# corner positions from the earlier detection
A=np.array([958.,455.]); B=np.array([682.,676.]); D=np.array([489.,567.5]); E=np.array([690.,813.])
def refine(pt):  # snap to the extreme-curvature point of the contour near pt
    Q=near(np.array(pt),12); return Q.mean(0)
def segment(p,q,exclude=14):
    """contour points strictly between corner regions p and q along the shorter path through the contour"""
    ip=np.argmin(np.hypot(*(P-p).T)); iq=np.argmin(np.hypot(*(P-q).T)); N=len(P)
    fwd=[(ip+j)%N for j in range(((iq-ip)%N)+1)]; bwd=[(ip-j)%N for j in range(((ip-iq)%N)+1)]
    idx=fwd if len(fwd)<len(bwd) else bwd
    return P[idx][exclude:-exclude]
def fit_line(Q):
    m=Q.mean(0); u,s,vt=np.linalg.svd(Q-m); return m,vt[0]
def inter(l1,l2):
    (p,d1),(q,d2)=l1,l2; M=np.c_[d1,-d2]; t=np.linalg.solve(M,q-p); return p+t[0]*d1
def quad_fit(Q,p0,p2):
    t=np.r_[0,np.cumsum(np.hypot(*np.diff(Q,axis=0).T))]; t/=t[-1]
    w=2*t*(1-t); rhs=Q-np.outer((1-t)**2,p0)-np.outer(t**2,p2)
    p1=(w[:,None]*rhs).sum(0)/(w**2).sum(); B_=lambda tt:np.outer((1-tt)**2,p0)+np.outer(2*tt*(1-tt),p1)+np.outer(tt**2,p2)
    res=np.hypot(*(B_(t)-Q).T); return p1,res.max(),res.mean()
# straight edges
ED=segment(E,D); l_ED=fit_line(ED)
DB=segment(D,B,exclude=6)   # runs along the top edge, the rounded corner, then the inner edge of the left arm
top=DB[(np.abs(DB[:,1]-D[1])<1.6)&(DB[:,0]<570)]; l_top=fit_line(top)
inn=DB[(DB[:,0]>606)&(DB[:,0]<672)]; l_in=fit_line(inn)
C=inter(l_top,l_in)
D2=inter(l_top,l_ED)
# long-arm curves
BA=segment(B,A,exclude=10); AE=segment(A,E,exclude=10)
B2=near(B,9).mean(0)
def cubic_fit(Q,p0,p3):
    t=np.r_[0,np.cumsum(np.hypot(*np.diff(Q,axis=0).T))]; t/=t[-1]
    b0,b1,b2,b3=(1-t)**3,3*(1-t)**2*t,3*(1-t)*t**2,t**3
    rhs=Q-np.outer(b0,p0)-np.outer(b3,p3); M=np.array([[ (b1*b1).sum(),(b1*b2).sum()],[(b1*b2).sum(),(b2*b2).sum()]])
    sol=np.linalg.solve(M,np.array([(b1[:,None]*rhs).sum(0),(b2[:,None]*rhs).sum(0)])); p1,p2=sol
    fit=np.outer(b0,p0)+np.outer(b1,p1)+np.outer(b2,p2)+np.outer(b3,p3); res=np.hypot(*(fit-Q).T); return p1,p2,res.max(),res.mean()
Bp0=B
c1_in,c2_in,mx1,me1=cubic_fit(BA,B,A); c1_out,c2_out,mx2,me2=cubic_fit(AE,A,E)
print("C corner",C.round(1),"D",D2.round(1),"| inner curve resid max %.2f mean %.2f | outer curve resid max %.2f mean %.2f"%(mx1,me1,mx2,me2))
r=15.0
dir_top=(l_top[1] if l_top[1][0]>0 else -l_top[1]); dir_in=(l_in[1] if l_in[1][0]>0 else -l_in[1])
Cin=C-dir_top*r; Cout=C+dir_in*r
# B must lie on the inner edge line: project
Bp=l_in[0]+np.dot(B-l_in[0],l_in[1])*l_in[1]
f=lambda p:"%.1f %.1f"%tuple(p)
path=f"M{f(D2)} L{f(Cin)} Q{f(C)} {f(Cout)} L{f(Bp)} C{f(c1_in)} {f(c2_in)} {f(A)} C{f(c1_out)} {f(c2_out)} {f(E)} Z"
print(path)
# dense sample for clearance maths
def qs(p0,p1,p2,n=40): t=np.linspace(0,1,n)[:,None]; return (1-t)**2*p0+2*t*(1-t)*p1+t**2*p2
def cs_(p0,p1,p2,p3,n=60): t=np.linspace(0,1,n)[:,None]; return (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3
pts=np.vstack([D2,Cin,qs(Cin,C,Cout,8),Bp,cs_(Bp,c1_in,c2_in,A),cs_(A,c1_out,c2_out,E),D2])
np.save("check_pts.npy",pts)
M=json.load(open("mark.json")); M["check"]=path; json.dump(M,open("mark.json","w"))
