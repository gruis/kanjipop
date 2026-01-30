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
