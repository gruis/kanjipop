# KanjiPop

KanjiPop is a local-first Kanji study web app with SRS, decks, and offline stroke-order diagrams (KanjiVG).

## Quick Start (Dev)
```bash
npm install
npm run dev
```

## KanjiVG SVGs (Required for Stroke Order)
KanjiPop expects KanjiVG SVGs at:
```
public/kanjisvg/kanji/
```

Download and unpack:
```bash
mkdir -p public
curl -L -o /tmp/kanjivg.zip https://github.com/KanjiVG/kanjivg/releases/latest/download/kanjivg.zip
unzip -q /tmp/kanjivg.zip -d /tmp/kanjivg
rm -rf public/kanjisvg
mkdir -p public/kanjisvg
cp -R /tmp/kanjivg/kanjivg/kanji public/kanjisvg/kanji
```

Sanity check:
- `public/kanjisvg/kanji/08a9e.svg` should exist for 語.

## Proxmox LXC Install
See `docs/DEPLOYMENT.md` for the community-scripts style installer.

## Release Packaging
Use:
```bash
./scripts/release/package-release.sh v1.0.0
./scripts/release/create-release.sh v1.0.0
```

This generates `dist/kanjipop-v1.0.0.tar.gz` and publishes a GitHub Release asset.

## Proxmox One‑Liner (LXC)
```bash
export APP_TAG="v1.0.0"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/gruis/kanjipop/main/scripts/proxmox/kanjipop.sh)"
```
