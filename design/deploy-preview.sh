#!/usr/bin/env bash
# Publish the design prototype to the development preview (https://dev.qohesion.app).
# The preview lives in its own repository because GitHub Pages serves one site per repository.
# Usage: design/deploy-preview.sh        (needs: git, gh logged in, and push access to the preview repo)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
PREVIEW_REPO="msolav/qohesion-preview"
WORK="${TMPDIR:-/tmp}/qohesion-preview-work"
DOMAIN="dev.qohesion.app"

rm -rf "$WORK"
gh repo clone "$PREVIEW_REPO" "$WORK" -- --quiet
cd "$WORK"

# Commit identity: the GitHub no-reply address, never a personal one.
git config user.name "$(gh api user --jq .login)"
git config user.email "$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"

# Replace the published content.
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
mkdir -p prototype
rsync -a --exclude '.DS_Store' "$SRC/design/prototype/" prototype/
mkdir -p assets
cp "$SRC/brand/gradient/qohesion-logo-gradient-dark.svg" assets/logo-dark.svg
cp "$SRC/design/prototype/fonts/figtree-latin.woff2" assets/
cp "$SRC/design/prototype/fonts/OFL-Figtree.txt" assets/
printf '%s\n' "$DOMAIN" > CNAME
: > .nojekyll
printf 'User-agent: *\nDisallow: /\n' > robots.txt

COMMIT="$(git -C "$SRC" rev-parse --short HEAD)"
DATE="$(date -u '+%Y-%m-%d %H:%M UTC')"

cat > index.html <<HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Qohesion · Aperçu de développement / Development preview</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0F224C">
<link rel="icon" href="prototype/assets/mark.svg" type="image/svg+xml">
<style>
@font-face{font-family:"Figtree";src:url(assets/figtree-latin.woff2) format("woff2");font-weight:300 900;font-display:swap}
*{box-sizing:border-box;margin:0}
body{min-height:100vh;min-height:100dvh;background:#0F224C;color:#EAF2FF;font-family:Figtree,system-ui,sans-serif;line-height:1.5;display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;padding:48px 20px}
.wrap{width:100%;max-width:38rem;display:grid;gap:36px}
.logo{display:block;width:min(70vw,320px);height:auto}
h1{font-size:1.5rem;font-weight:800;line-height:1.2;text-wrap:balance}
h1 span{display:block;font-size:1rem;font-weight:500;color:#A9BEE6;margin-top:4px}
.note{color:#C9D8F2;font-size:.95rem}
ul{list-style:none;padding:0;display:grid;gap:12px}
li a{display:block;padding:16px 18px;border:1.5px solid #3A5287;border-radius:14px;color:#EAF2FF;text-decoration:none;transition:background .15s ease-out,border-color .15s ease-out}
li a:hover{background:#17306A;border-color:#7FD1A4}
li b{display:block;font-size:1.05rem}
li small{display:block;color:#A9BEE6;margin-top:2px;font-size:.9rem}
a:focus-visible{outline:3px solid #7FD1A4;outline-offset:3px}
h2{font-size:1.05rem;font-weight:700;margin-bottom:12px}
footer{color:#A9BEE6;font-size:.85rem;display:flex;flex-wrap:wrap;gap:4px 16px}
footer a{color:#EAF2FF}
::selection{background:#7FD1A4;color:#0F224C}
</style>
</head>
<body>
<div class="wrap">
<img class="logo" src="assets/logo-dark.svg" alt="Qohesion" width="320" height="58">
<h1>Aperçu de développement <span lang="en">Development preview</span></h1>
<p class="note">Travail en cours, avec une organisation et des chiffres d’exemple. Rien ici n’est final et aucun vote n’est enregistré. <span lang="en">Work in progress, with a sample organization and sample figures. Nothing here is final and no vote is recorded.</span></p>

<section aria-labelledby="s1">
<h2 id="s1">Écran de vote <span lang="en">· Voter ballot screen</span></h2>
<ul>
<li><a href="prototype/?theme=seed-packet&amp;lang=both"><b>Seed Packet</b><small>Bloc de couleur et grands choix <span lang="en">· Colour block and large choices</span></small></a></li>
<li><a href="prototype/?theme=ballot-paper&amp;lang=both"><b>Ballot Paper</b><small>Bulletin réglé et talon de reçu <span lang="en">· Ruled slip and receipt stub</span></small></a></li>
</ul>
</section>

<footer>
<span>Version ${COMMIT} · ${DATE}</span>
<a href="https://github.com/msolav/qohesion">Code source <span lang="en">· Source code</span></a>
<a href="https://qohesion.app">qohesion.app</a>
</footer>
</div>
</body>
</html>
HTML

cat > README.md <<MD
# qohesion-preview

Generated development preview served at https://${DOMAIN}. Do not edit by hand: it is rebuilt from the main repository by \`design/deploy-preview.sh\`. Not indexed by search engines.
MD

git add -A
if git diff --cached --quiet; then echo "Nothing to publish."; exit 0; fi
git commit -q -m "Preview build ${COMMIT}

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:main
echo "Published preview build ${COMMIT} to ${DOMAIN}"
