// build-kanji-html.mjs
//
// Generate an offline HTML "kanji writing cards" page from a list of kanji.
// - Prompts show readings + meaning
// - "Reveal" shows the kanji + stroke order diagram (SVG)
// - Examples pulled from unofficial-jisho-api
// - Stroke order comes from KanjiVG (reliable, offline, deterministic)
//   with an optional fallback to Jisho's SVG if KanjiVG is missing.
//
// Requirements:
//   - Node 18+ (Node 20 OK)
//   - npm i unofficial-jisho-api
//   - npm i cheerio@1.0.0-rc.12   (workaround for unofficial-jisho-api + Node ESM)
//
// KanjiVG dataset setup (one-time):
//   mkdir -p data
//   cd data
//   curl -L -o kanjivg.zip https://github.com/KanjiVG/kanjivg/releases/latest/download/kanjivg.zip
//   unzip kanjivg.zip
//   cd ..
//
// Usage:
//   node build-kanji-html.mjs 語 学 読 面積
//   node build-kanji-html.mjs --from-text "（paste text here）"
//
// Output:
//   out/kanji-cards.html
//   out/assets/*.svg

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import JishoAPI from "unofficial-jisho-api";

// Node 18+ has global fetch. If you're on Node 16, uncomment:
// import fetch from "node-fetch";
// globalThis.fetch = fetch;

const jisho = new JishoAPI();
const KANJI_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqKanjiFromText(text) {
  // CJK Unified Ideographs + Extension A (basic coverage)
  const matches = text.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g) || [];
  return [...new Set(matches)];
}

function hasKanji(text) {
  return KANJI_RE.test(text);
}

function normalizeReading(reading) {
  return String(reading || "").replaceAll(".", "");
}

function pickPrimaryKanjiReading(kunyomi = [], onyomi = []) {
  if (kunyomi.length > 0) return normalizeReading(kunyomi[0]);
  if (onyomi.length > 0) return normalizeReading(onyomi[0]);
  return "";
}

function kanjiToCodepointHex(k) {
  // KanjiVG filenames are unicode codepoints in hex (usually 5 digits),
  // e.g. 語 = 8a9e -> 08a9e.svg
  const cp = k.codePointAt(0);
  if (cp == null) return null;
  return cp.toString(16).padStart(5, "0");
}

async function copyKanjiVG(k, assetsDir) {
  const hex = kanjiToCodepointHex(k);
  if (!hex) return null;

  // Typical path after unzipping:
  // data/kanjivg/kanji/08a9e.svg
  const src = path.resolve(`data/kanjivg/kanji/${hex}.svg`);
  const destName = `${k}_kanjivg.svg`;
  const dest = path.join(assetsDir, destName);

  try {
    await fs.copyFile(src, dest);
    return `assets/${destName}`;
  } catch {
    return null;
  }
}

async function download(url, outPath) {
  // Some hosts are picky; set a user-agent to reduce blocks.
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "kanji-cards/1.0 (+local script; https://example.invalid)",
      Accept: "image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Failed download ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

function normalizeExamples(exResults, limit = 3) {
  const results = (exResults?.results || []).slice(0, limit);
  return results.map((e) => ({
    kanji: e.kanji || "",
    kana: e.kana || "",
    english: e.english || "",
  }));
}

function pickPhraseEntry(phrase, phraseResult) {
  const data = phraseResult?.data || [];
  let best = data.find((entry) =>
    (entry.japanese || []).some((j) => j.word === phrase)
  );
  if (!best) best = data[0];
  if (!best) return null;

  const jpExact = (best.japanese || []).find((j) => j.word === phrase);
  const jp = jpExact || (best.japanese || [])[0] || {};

  const meaning = (best.senses || [])[0]?.english_definitions?.join("; ") || "";
  const jlpt = (best.jlpt || [])[0] || "";
  const parts = (best.senses || [])[0]?.parts_of_speech || [];

  return {
    word: jp.word || phrase,
    reading: jp.reading || "",
    meaning,
    jlpt,
    parts,
  };
}

function buildMaskedExampleText(exampleKanji, term, termReading) {
  if (!exampleKanji) return "";
  if (!term || !termReading) return exampleKanji;
  return exampleKanji.split(term).join(termReading);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage:\n  node build-kanji-html.mjs 語 学 読 面積\n  node build-kanji-html.mjs --from-text \"...your text...\""
    );
    process.exit(1);
  }

  let termList = [];
  if (args[0] === "--from-text") {
    const text = args.slice(1).join(" ");
    termList = uniqKanjiFromText(text);
  } else {
    termList = args;
  }

  termList = termList
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0)
    .filter((t) => hasKanji(t));

  const outDir = path.resolve("out");
  const assetsDir = path.join(outDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  const items = [];
  const kanjiInfoCache = new Map();

  for (const term of termList) {
    try {
      const isSingleKanji = term.length === 1 && hasKanji(term);

      let info = null;
      let phraseInfo = null;
      let examples = [];

      if (isSingleKanji) {
        info = await jisho.searchForKanji(term);
        const ex = await jisho.searchForExamples(term);
        examples = normalizeExamples(ex, 3);
      } else {
        const phraseResult = await jisho.searchForPhrase(term);
        phraseInfo = pickPhraseEntry(term, phraseResult);
        const ex = await jisho.searchForExamples(term);
        examples = normalizeExamples(ex, 3);
      }

      const kanjiChars = [...term].filter((c) => hasKanji(c));
      const localSvgs = [];

      for (const k of kanjiChars) {
        let localSvg = await copyKanjiVG(k, assetsDir);
        if (!localSvg) {
          let kInfo = null;
          if (isSingleKanji && info?.strokeOrderSvgUri) {
            kInfo = info;
          } else {
            if (kanjiInfoCache.has(k)) {
              kInfo = kanjiInfoCache.get(k);
            } else {
              try {
                kInfo = await jisho.searchForKanji(k);
              } catch {
                kInfo = null;
              }
              kanjiInfoCache.set(k, kInfo);
            }
          }

          if (kInfo?.strokeOrderSvgUri) {
            try {
              const svgName = `${k}_jisho.svg`;
              const svgPath = path.join(assetsDir, svgName);
              await download(kInfo.strokeOrderSvgUri, svgPath);
              localSvg = `assets/${svgName}`;
            } catch {
              // ignore and proceed without SVG
            }
          }
        }
        if (localSvg) localSvgs.push({ kanji: k, svg: localSvg });
      }

      const readingForMask = isSingleKanji
        ? pickPrimaryKanjiReading(info?.kunyomi, info?.onyomi)
        : normalizeReading(phraseInfo?.reading || "");

      items.push({
        term,
        isSingleKanji,
        found: info?.found,
        meaning: isSingleKanji ? info?.meaning : phraseInfo?.meaning,
        kunyomi: info?.kunyomi || [],
        onyomi: info?.onyomi || [],
        strokeCount: info?.strokeCount,
        jlptLevel: info?.jlptLevel || phraseInfo?.jlpt,
        taughtIn: info?.taughtIn,
        partsOfSpeech: phraseInfo?.parts || [],
        localSvgs,
        jishoUri: info?.uri || jisho.getUriForPhraseSearch(term),
        examples,
        readingForMask,
        phraseReading: phraseInfo?.reading || "",
      });
    } catch (err) {
      items.push({ term, error: String(err?.message || err) });
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kanji Writing Cards</title>
<style>
  :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Noto Sans JP", sans-serif; }
  body { margin: 24px; line-height: 1.35; }
  .top { display:flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .hint { color:#555; font-size: 14px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(340px,1fr)); gap: 16px; margin-top: 16px; }
  .card { border: 1px solid #ddd; border-radius: 14px; padding: 14px; }
  .prompt { font-size: 20px; font-weight: 800; }
  .meta { margin-top: 6px; color:#333; font-size: 14px; }
  .revealKanji { font-size: 64px; font-weight: 900; margin: 10px 0 4px; }
  details { margin-top: 10px; }
  summary { cursor: pointer; font-weight: 800; }
  .imgRow { display:flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; margin-top: 8px; }
  .imgBox { border: 1px solid #eee; border-radius: 12px; padding: 10px; width: 100%; }
  .imgBox img { width: 100%; max-width: 420px; height: auto; display:block; }
  .examples { margin-top: 10px; }
  .ex { padding: 8px 10px; border: 1px solid #eee; border-radius: 12px; margin-top: 8px; }
  .jp { font-size: 16px; }
  .kana { color:#444; font-size: 14px; margin-top: 2px; }
  .err { color: #b00020; font-weight: 800; }
  .src { margin-top: 10px; font-size: 13px; color:#444; }
  .src a { color: inherit; }
  @media print {
    body { margin: 10mm; }
    details { open: true; }
    summary { display:none; }
  }
</style>
</head>
<body>
  <div class="top">
    <h1 style="margin:0;">Kanji Writing Cards</h1>
    <div class="hint">Workflow: read the prompt → write on paper/tablet → open “Reveal” to check.</div>
  </div>

  <div class="grid">
    ${items
      .map((it) => {
        if (it.error) {
          return `<div class="card">
  <div class="prompt">${esc(it.term)}</div>
  <div class="err">Error: ${esc(it.error)}</div>
</div>`;
        }

        const readingLine = it.isSingleKanji
          ? [
              it.kunyomi?.length ? `訓: ${it.kunyomi.join(" / ")}` : null,
              it.onyomi?.length ? `音: ${it.onyomi.join(" / ")}` : null,
            ]
              .filter(Boolean)
              .join(" ・ ")
          : it.phraseReading
            ? `読み: ${it.phraseReading}`
            : "読み: (none found)";

        const miscLine = [
          it.strokeCount != null ? `画数: ${it.strokeCount}` : null,
          it.jlptLevel ? `JLPT: ${it.jlptLevel}` : null,
          it.taughtIn ? `学年: ${it.taughtIn}` : null,
          it.partsOfSpeech?.length ? `品詞: ${it.partsOfSpeech.join(" / ")}` : null,
        ]
          .filter(Boolean)
          .join(" ・ ");

        const hasExamples = (it.examples || []).length > 0;
        const maskedExamples = (it.examples || []).map((e) =>
          buildMaskedExampleText(e.kanji, it.term, it.readingForMask)
        );

        return `<div class="card">
  <div class="prompt">${esc(readingLine || "読み: (none found)")}</div>
  <div class="meta">${esc(it.meaning || "")}</div>
  <div class="meta">${esc(miscLine)}</div>

  ${
    hasExamples
      ? `<div class="examples">
    <div class="meta" style="margin-top:10px; font-weight:800;">例文</div>
    ${maskedExamples
      .map(
        (jp) => `<div class="ex">
      <div class="jp">${esc(jp)}</div>
    </div>`
      )
      .join("")}
  </div>`
      : `<div class="meta" style="margin-top:10px;"><em>例文なし。</em></div>`
  }

  <details>
    <summary>Reveal</summary>

    <div class="revealKanji">${esc(it.term)}</div>

    ${
      it.localSvgs?.length
        ? `<div class="imgRow">
      ${it.localSvgs
        .map(
          (s) => `<div class="imgBox">
        <div class="meta" style="font-weight:800;">${esc(s.kanji)}: stroke order</div>
        <img src="${esc(s.svg)}" alt="stroke order svg"/>
      </div>`
        )
        .join("")}
    </div>`
        : `<div class="meta" style="margin-top:8px;"><em>No stroke SVG found (KanjiVG missing and Jisho fallback unavailable).</em></div>`
    }

    ${
      hasExamples
        ? `<div class="examples">
      <div class="meta" style="margin-top:10px; font-weight:800;">例文</div>
      ${(it.examples || [])
        .map(
          (e) => `<div class="ex">
        <div class="jp">${esc(e.kanji)}</div>
        <div class="kana">${esc(e.kana)}</div>
      </div>`
        )
        .join("")}
    </div>`
        : ``
    }

    <div class="src">Metadata/examples via <a href="${esc(
      it.jishoUri || "#"
    )}" target="_blank" rel="noreferrer">Jisho</a>. Stroke SVG from KanjiVG when available.</div>

  </details>
</div>`;
      })
      .join("")}
  </div>
</body>
</html>`;

  await fs.writeFile(path.join(outDir, "kanji-cards.html"), html, "utf8");
  console.log(`✅ Wrote: ${path.join(outDir, "kanji-cards.html")}`);
  console.log(`✅ Assets: ${path.join(outDir, "assets")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
