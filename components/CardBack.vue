<script setup lang="ts">
import type { KanjiCompound, KanjiDetails } from "~/lib/services/kanjiApi";
import StrokeOrderGrid from "~/components/StrokeOrderGrid.vue";

const props = defineProps<{
  term: string;
  meta: Pick<KanjiDetails, "strokeCount" | "jlptLevel" | "taughtIn"> | null;
  compounds: KanjiCompound[];
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
</script>

<template>
  <div>
    <StrokeOrderGrid :term="term" />

    <div class="mt-3">
      <p v-if="metaLine" class="text-muted mb-3">{{ metaLine }}</p>

      <details>
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
