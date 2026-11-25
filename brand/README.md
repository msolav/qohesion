# Qohesion brand assets

The mark is a circle (the Q) whose tail is a check mark. The check's long stroke rises as a `/`, so the name reads **Q/ohesion**.

| File | Use |
|---|---|
| `qohesion-logo.svg` | Primary lockup on light backgrounds (transparent) |
| `qohesion-logo-dark.svg` | Lockup on dark backgrounds |
| `qohesion-logo-mono.svg` | One color, takes the surrounding text color (`currentColor`) |
| `qohesion-mark.svg`, `qohesion-mark-mono.svg` | Symbol only |
| `qohesion-avatar.svg`, `qohesion-avatar-dark.svg` | Square avatars, the mark sits inside the safe area of a circular crop |
| `qohesion-icon.svg` | Rounded app icon |
| `favicon.svg` | Adapts to light and dark browser themes |
| `png/` | Raster exports with solid backgrounds (logo, avatars, app icon, favicons) |

SVG files are the masters and are transparent. PNG files have a solid background because of the renderer used to export them.

## Colors

| Name | Hex |
|---|---|
| Ink | `#14151A` |
| Forest green | `#1F5C46` |
| Paper | `#F6F3EC` |
| Night | `#0B0D12` |
| Mint (check on dark) | `#7FD1A4` |

## Typeface

The word is set in **Outfit Medium (500)**, outlined to paths so no font is needed to display it. Outfit is licensed under the SIL Open Font License 1.1, see `OFL-Outfit.txt`.

## Rebuilding

`src/build_logo.py` generates every SVG from the geometry (ring radius 80, stroke 32, check and slash angles). It places the word so the clearance between the slash and the "o" equals `GAP_TEXT`.

```sh
pip install fonttools
python3 src/build_logo.py path/to/Outfit.ttf output-dir
```

## Clearance and use

Keep a margin around the logo equal to the height of the "o". Do not recolor the check and ring differently from the supplied variants, do not add effects, and do not set the word in another font.
