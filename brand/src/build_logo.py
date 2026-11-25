"""Builds the Qohesion logo set. Geometry in user units: ring R=80, stroke 32.
Text is outlined from Jost (SIL OFL 1.1) so the SVGs need no installed font."""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = sys.argv[1]; OUT = sys.argv[2]
R, SW, CX, CY, GAP = 80, 32, 100, 120, 13
P0, V, E = (CX+14, CY+8), (CX+86, CY+80), (CX+171, CY-78)
BASE = CY + R + SW/2
INK, GREEN, PAPER, MINT, NIGHT = "#14151A", "#1F5C46", "#F6F3EC", "#7FD1A4", "#0B0D12"

f = instancer.instantiateVariableFont(TTFont(FONT), {"wght": 500})
gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
hpen = SVGPathPen(gs); 
from fontTools.pens.boundsPen import BoundsPen
bp = BoundsPen(gs); gs[cmap[ord("h")]].draw(bp)
SCALE = (BASE - (CY - R - SW/2)) / bp.bounds[3]      # 'h' ascender = ring height
def word(text, x0):
    d, x = "", x0
    for ch in text:
        g = cmap[ord(ch)]; p = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
        gs[g].draw(TransformPen(p, (SCALE, 0, 0, -SCALE, x, BASE))); d += p.getCommands()
        x += hmtx[g][0] * SCALE
    return d, x
# Place the word so the true minimum distance between the slash and the "o" outline equals GAP_TEXT
GAP_TEXT = 12
from fontTools.pens.basePen import BasePen
class Sampler(BasePen):
    def __init__(self, gs): super().__init__(gs); self.pts = []; self.cur = (0, 0)
    def _moveTo(self, p): self.cur = p; self.pts.append(p)
    def _lineTo(self, p):
        a = self.cur
        for i in range(1, 11): t = i / 10; self.pts.append((a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t))
        self.cur = p
    def _curveToOne(self, p1, p2, p3):
        a = self.cur
        for i in range(1, 21):
            t = i / 20; m = 1 - t
            self.pts.append((m**3*a[0]+3*m*m*t*p1[0]+3*m*t*t*p2[0]+t**3*p3[0], m**3*a[1]+3*m*m*t*p1[1]+3*m*t*t*p2[1]+t**3*p3[1]))
        self.cur = p3
    def _qCurveToOne(self, p1, p2):
        a = self.cur
        for i in range(1, 21):
            t = i / 20; m = 1 - t
            self.pts.append((m*m*a[0]+2*m*t*p1[0]+t*t*p2[0], m*m*a[1]+2*m*t*p1[1]+t*t*p2[1]))
        self.cur = p2
_sp = Sampler(gs); gs[cmap[ord("o")]].draw(_sp)
o_pts = [(x * SCALE, BASE - y * SCALE) for x, y in _sp.pts]            # outline in logo units, origin at glyph x=0
def seg_dist(p, a, b):
    ax, ay, bx, by = a[0], a[1], b[0], b[1]; dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((p[0]-ax)*dx + (p[1]-ay)*dy) / (dx*dx + dy*dy)))
    return ((p[0]-ax-t*dx)**2 + (p[1]-ay-t*dy)**2) ** 0.5
def clearance(x0): return min(seg_dist((x0 + px, py), V, E) for px, py in o_pts) - SW / 2
lo, hi = 0.0, 600.0
for _ in range(60):
    mid = (lo + hi) / 2
    lo, hi = (mid, hi) if clearance(mid) < GAP_TEXT else (lo, mid)
TXT_X = hi
WORD_D, END_X = word("ohesion", TXT_X)

def mark_body(uid, ring, check):
    return (f'<defs><mask id="{uid}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="600" height="500">'
            f'<rect x="-100" y="-100" width="600" height="500" fill="#fff"/>'
            f'<path d="M{P0[0]} {P0[1]} L{V[0]} {V[1]}" stroke="#000" stroke-width="{SW+2*GAP}" fill="none"/></mask></defs>'
            f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="none" stroke="{ring}" stroke-width="{SW}" mask="url(#{uid})"/>'
            f'<path d="M{P0[0]} {P0[1]} L{V[0]} {V[1]} L{E[0]} {E[1]}" fill="none" stroke="{check}" '
            f'stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round"/>')

def svg(vb, body, title, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}"{extra}>'
            f'<title>{title}</title>{body}</svg>\n')

X0, Y0, PAD = CX-R-SW/2, CY-R-SW/2, 14
LOCK_VB = f"{X0-PAD:.0f} {Y0-PAD:.0f} {END_X-X0+2*PAD:.0f} {BASE-Y0+2*PAD:.0f}"
MARK_VB = f"{X0-PAD:.0f} {Y0-PAD:.0f} {E[0]+SW/2-X0+2*PAD:.0f} {BASE-Y0+2*PAD:.0f}"

def lockup(uid, ring, check, text):
    return mark_body(uid, ring, check) + f'<path d="{WORD_D}" fill="{text}"/>'

files = {
 "qohesion-logo.svg":      svg(LOCK_VB, lockup("g", INK, GREEN, INK), "Qohesion"),
 "qohesion-logo-dark.svg": svg(LOCK_VB, lockup("g", PAPER, MINT, PAPER), "Qohesion"),
 "qohesion-logo-mono.svg": svg(LOCK_VB, lockup("g", "currentColor", "currentColor", "currentColor"), "Qohesion"),
 "qohesion-mark.svg":      svg(MARK_VB, mark_body("g", INK, GREEN), "Qohesion"),
 "qohesion-mark-mono.svg": svg(MARK_VB, mark_body("g", "currentColor", "currentColor"), "Qohesion"),
}
# Square avatar/icon: mark sits well inside a circle (safe for round crops)
def square(size, bg, ring, check, fill_ratio=0.80, rounded=0):
    k = fill_ratio * (size/2) / 170
    body = f'<rect width="{size}" height="{size}" rx="{rounded}" fill="{bg}"/>'
    body += f'<g transform="translate({size/2} {size/2}) scale({k}) translate({-(CX+45)} {-CY})">{mark_body("g", ring, check)}</g>'
    return svg(f"0 0 {size} {size}", body, "Qohesion", f' width="{size}" height="{size}"')
files["qohesion-avatar.svg"]       = square(1024, PAPER, INK, GREEN)
files["qohesion-avatar-dark.svg"]  = square(1024, NIGHT, PAPER, MINT)
files["qohesion-icon.svg"]         = square(512, PAPER, INK, GREEN, 0.74, 112)
# Favicon: mark only, adapts to light/dark browser chrome
fav_body = ('<style>.r,.c{fill:none;stroke-linecap:round;stroke-linejoin:round}.r{stroke:#14151A}.c{stroke:#1F5C46}'
            '@media (prefers-color-scheme:dark){.r{stroke:#F6F3EC}.c{stroke:#7FD1A4}}</style>')
fav_body += (f'<defs><mask id="g" maskUnits="userSpaceOnUse" x="-100" y="-100" width="600" height="500"><rect x="-100" y="-100" width="600" height="500" fill="#fff"/>'
             f'<path d="M{P0[0]} {P0[1]} L{V[0]} {V[1]}" stroke="#000" stroke-width="{SW+2*GAP+8}" fill="none"/></mask></defs>'
             f'<circle class="r" cx="{CX}" cy="{CY}" r="{R}" stroke-width="{SW+8}" mask="url(#g)"/>'
             f'<path class="c" d="M{P0[0]} {P0[1]} L{V[0]} {V[1]} L{E[0]} {E[1]}" stroke-width="{SW+8}"/>')
files["favicon.svg"] = svg(f"{X0-6:.0f} {Y0-6:.0f} {E[0]+SW/2-X0+12:.0f} {BASE-Y0+12:.0f}", fav_body, "Qohesion")
for name, s in files.items(): open(f"{OUT}/{name}", "w").write(s)
print("lockup viewBox:", LOCK_VB, "| mark viewBox:", MARK_VB, "| scale", round(SCALE,4))
