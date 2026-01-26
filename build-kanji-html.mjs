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
//   node build-kanji-html.mjs 語 学 読
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

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage:\n  node build-kanji-html.mjs 語 学 読\n  node build-kanji-html.mjs --from-text \"...your text...\""
    );
    process.exit(1);
  }

  let kanjiList = [];
  if (args[0] === "--from-text") {
    const text = args.slice(1).join(" ");
    kanjiList = uniqKanjiFromText(text);
  } else {
    kanjiList = args;
  }

  // Basic validation: only keep single-character kanji entries
  kanjiList = kanjiList
    .map((k) => String(k).trim())
    .filter((k) => k.length > 0)
    .filter((k) => (k.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/) ? true : false))
    .map((k) => [...k][0]); // if someone passed multi-char, take first char

  const outDir = path.resolve("out");
  const assetsDir = path.join(outDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  const items = [];

  for (const k of kanjiList) {
    try {
      const info = await jisho.searchForKanji(k);

      // Examples: searching by kanji char usually yields useful examples.
      const ex = await jisho.searchForExamples(k);
      const examples = normalizeExamples(ex, 3);

      // Stroke order SVG: KanjiVG primary (offline + complete)
      let localSvg = await copyKanjiVG(k, assetsDir);

      // Fallback: Jisho SVG (may be missing/fragile, but worth trying)
      if (!localSvg && info.strokeOrderSvgUri) {
        try {
          const svgName = `${k}_jisho.svg`;
          const svgPath = path.join(assetsDir, svgName);
          await download(info.strokeOrderSvgUri, svgPath);
          localSvg = `assets/${svgName}`;
        } catch {
          // ignore and proceed without SVG
        }
      }

      items.push({
        kanji: k,
        found: info.found,
        meaning: info.meaning,
        kunyomi: info.kunyomi || [],
        onyomi: info.onyomi || [],
        strokeCount: info.strokeCount,
        jlptLevel: info.jlptLevel,
        taughtIn: info.taughtIn,
        localSvg,
        jishoUri: info.uri,
        examples,
      });
    } catch (err) {
      items.push({ kanji: k, error: String(err?.message || err) });
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
  .en { color:#222; font-size: 14px; margin-top: 4px; }
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
  <div class="prompt">${esc(it.kanji)}</div>
  <div class="err">Error: ${esc(it.error)}</div>
</div>`;
        }

        const readingLine = [
          it.kunyomi?.length ? `Kun: ${it.kunyomi.join(" / ")}` : null,
          it.onyomi?.length ? `On: ${it.onyomi.join(" / ")}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        const miscLine = [
          it.strokeCount != null ? `Strokes: ${it.strokeCount}` : null,
          it.jlptLevel ? `JLPT: ${it.jlptLevel}` : null,
          it.taughtIn ? `Taught: ${it.taughtIn}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        const hasExamples = (it.examples || []).length > 0;

        return `<div class="card">
  <div class="prompt">${esc(readingLine || "Reading: (none found)")}</div>
  <div class="meta">${esc(it.meaning || "")}</div>
  <div class="meta">${esc(miscLine)}</div>

  <details>
    <summary>Reveal</summary>

    <div class="revealKanji">${esc(it.kanji)}</div>

    ${
      it.localSvg
        ? `<div class="imgRow">
      <div class="imgBox">
        <div class="meta" style="font-weight:800;">Stroke order</div>
        <img src="${esc(it.localSvg)}" alt="stroke order svg"/>
      </div>
    </div>`
        : `<div class="meta" style="margin-top:8px;"><em>No stroke SVG found (KanjiVG missing and Jisho fallback unavailable).</em></div>`
    }

    ${
      hasExamples
        ? `<div class="examples">
      <div class="meta" style="margin-top:10px; font-weight:800;">Examples</div>
      ${(it.examples || [])
        .map(
          (e) => `<div class="ex">
        <div class="jp">${esc(e.kanji)}</div>
        <div class="kana">${esc(e.kana)}</div>
        <div class="en">${esc(e.english)}</div>
      </div>`
        )
        .join("")}
    </div>`
        : `<div class="meta" style="margin-top:10px;"><em>No examples found.</em></div>`
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
