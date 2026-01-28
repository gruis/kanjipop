<script setup lang="ts">
import type { KanjiCompound, KanjiDetails, KanjiMnemonic } from "~/lib/services/kanjiApi";
import StrokeOrderGrid from "~/components/StrokeOrderGrid.vue";

const props = defineProps<{
  term: string;
  meta: Pick<KanjiDetails, "strokeCount" | "jlptLevel" | "taughtIn"> | null;
  compounds: KanjiCompound[];
  mnemonics: KanjiMnemonic[];
  openMnemonics?: boolean;
  openCompounds?: boolean;
  sourceLinks: Array<{ label: string; href: string }>;
}>();

const metaLine = computed(() => {
  const meta = props.meta;
  if (!meta) return "";
  const parts = [
    meta.strokeCount != null ? `画数: ${meta.strokeCount}` : null,
    meta.jlptLevel ? `JLPT: ${meta.jlptLevel}` : null,
    meta.taughtIn ? `学年: ${meta.taughtIn}` : null,
  ].filter(Boolean);
  return parts.join(" ・ ");
});

const mnemonicLabel = (kind: string) => {
  if (kind === "meaning") return "Meaning";
  if (kind === "reading") return "Reading";
  return kind;
};

const renderMnemonic = (text: string) => {
  const withBreaks = text.replace(/<br\s*\/?>/gi, "\n");
  const tagged = withBreaks
    .replace(/<kanji>/gi, "[[KANJI]]")
    .replace(/<\/kanji>/gi, "[[/KANJI]]")
    .replace(/<reading>/gi, "[[READING]]")
    .replace(/<\/reading>/gi, "[[/READING]]")
    .replace(/<radical>/gi, "[[RADICAL]]")
    .replace(/<\/radical>/gi, "[[/RADICAL]]")
    .replace(/<meaning>/gi, "[[MEANING]]")
    .replace(/<\/meaning>/gi, "[[/MEANING]]")
    .replace(/<vocabulary>/gi, "[[VOCAB]]")
    .replace(/<\/vocabulary>/gi, "[[/VOCAB]]")
    .replace(/<[^>]+>/g, "");

  const escaped = tagged
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\[\[KANJI\]\]/g, '<span class="mnemonic-tag mnemonic-kanji">')
    .replace(/\[\[\/KANJI\]\]/g, "</span>")
    .replace(/\[\[READING\]\]/g, '<span class="mnemonic-tag mnemonic-reading">')
    .replace(/\[\[\/READING\]\]/g, "</span>")
    .replace(/\[\[RADICAL\]\]/g, '<span class="mnemonic-tag mnemonic-radical">')
    .replace(/\[\[\/RADICAL\]\]/g, "</span>")
    .replace(/\[\[MEANING\]\]/g, '<span class="mnemonic-tag mnemonic-meaning">')
    .replace(/\[\[\/MEANING\]\]/g, "</span>")
    .replace(/\[\[VOCAB\]\]/g, '<span class="mnemonic-tag mnemonic-vocab">')
    .replace(/\[\[\/VOCAB\]\]/g, "</span>")
    .trim();
};
</script>

<template>
  <div>
    <StrokeOrderGrid :term="term" />

    <div class="mt-3">
      <p v-if="metaLine" class="text-muted mb-3">{{ metaLine }}</p>

      <details class="mb-3" :open="openMnemonics">
        <summary class="fw-semibold">Mnemonics</summary>
        <div v-if="mnemonics.length === 0" class="text-muted mt-2">No mnemonics yet.</div>
        <div v-else class="list-group mt-2">
          <div v-for="m in mnemonics" :key="`${m.kind}-${m.text.slice(0, 12)}`" class="list-group-item">
            <div class="text-muted small">{{ mnemonicLabel(m.kind) }}</div>
            <div class="mnemonic-text" v-html="renderMnemonic(m.text)"></div>
          </div>
        </div>
      </details>

      <details :open="openCompounds">
        <summary class="fw-semibold">Compounds</summary>
        <div v-if="compounds.length === 0" class="text-muted mt-2">
          No compounds yet.
        </div>
        <div v-else class="list-group mt-2 mb-3">
          <div v-for="c in compounds" :key="`${c.word}-${c.reading}`" class="list-group-item">
            <div class="fw-semibold">{{ c.word }} <span class="text-muted">{{ c.reading }}</span></div>
            <div class="text-muted">{{ c.meaning }}</div>
          </div>
        </div>
      </details>

      <div class="small text-muted mt-2">
        Sources:
        <span v-for="link in sourceLinks" :key="link.href" class="me-2">
          <a :href="link.href" target="_blank" rel="noreferrer">{{ link.label }}</a>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mnemonic-text {
  white-space: pre-line;
}
.mnemonic-tag {
  font-weight: 600;
}
.mnemonic-kanji,
.mnemonic-reading,
.mnemonic-radical,
.mnemonic-meaning,
.mnemonic-vocab {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
