set +e
cd /tmp/trace; rm -rf out png; mkdir out png
python3 build_lockup.py out
python3 - <<'PY'
import re
m=open("/tmp/trace/out/qohesion-mark-gradient.svg").read()
vb=[float(v) for v in re.search(r'viewBox="([^"]+)"',m).group(1).split()]
body=re.sub(r'^<svg[^>]*>|</svg>\s*$','',m.strip())
def square(name,size,fill,ratio,rx=0):
    k=ratio*size/vb[2]; ox=size/2-k*(vb[0]+vb[2]/2); oy=size/2-k*(vb[1]+vb[3]/2)
    open(f"/tmp/trace/out/{name}.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><rect width="{size}" height="{size}" rx="{rx}" fill="{fill}"/><g transform="translate({ox:.1f} {oy:.1f}) scale({k:.4f})">{body}</g></svg>')
square("avatar",1024,"#0F224C",0.70); square("icon",512,"#0F224C",0.72,112); square("touch",180,"#0F224C",0.74); square("fav",32,"#0F224C",0.9,6)
PY
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render(){ python3 - "$1" "$2" "$3" <<'PY'
import sys
svg,w,h=sys.argv[1:4]
open("/tmp/trace/r.html","w").write(f'<!doctype html><body style="margin:0;background:transparent"><img src="file://{svg}" width="{w}" height="{h}" style="display:block"></body>')
PY
"$C" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=$2,$3 --screenshot=$4 file:///tmp/trace/r.html >/dev/null 2>&1; }
render /tmp/trace/out/qohesion-logo-gradient.svg 2400 435 png/qohesion-logo-gradient.png
render /tmp/trace/out/qohesion-logo-gradient-dark.svg 2400 435 png/qohesion-logo-gradient-dark.png
render /tmp/trace/out/qohesion-logo-gradient-plate.svg 2400 $(python3 -c "
import re;s=open('/tmp/trace/out/qohesion-logo-gradient-plate.svg').read();v=[float(x) for x in re.search(r'viewBox=\"([^\"]+)\"',s).group(1).split()];print(round(2400*v[3]/v[2]))") png/qohesion-logo-gradient-plate.png
render /tmp/trace/out/qohesion-mark-gradient.svg 1000 849 png/qohesion-mark-gradient.png
render /tmp/trace/out/avatar.svg 1024 1024 png/qohesion-avatar-gradient.png
render /tmp/trace/out/icon.svg 512 512 png/icon-512.png
render /tmp/trace/out/touch.svg 180 180 png/apple-touch-icon.png
render /tmp/trace/out/fav.svg 32 32 png/favicon-32.png
ls png
