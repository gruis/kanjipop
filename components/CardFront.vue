<script setup lang="ts">
import { maskExample } from "~/lib/services/exampleMask";
import type { KanjiExample } from "~/lib/services/kanjiApi";

const props = defineProps<{
  readings: string[];
  meanings: string[];
  term: string;
  maskReading: string;
  examples: KanjiExample[];
}>();

const kunyomiLine = computed(() => props.readings.find((r) => r.startsWith("訓:")) || "");
const onyomiLine = computed(() => props.readings.find((r) => r.startsWith("音:")) || "");
const hasKanjiReadings = computed(() => Boolean(kunyomiLine.value || onyomiLine.value));
</script>

<template>
  <div>
    <div class="mb-4">
      <template v-if="hasKanjiReadings">
        <div v-if="kunyomiLine" class="h4 fw-bold mb-1">{{ kunyomiLine }}</div>
        <div v-if="onyomiLine" class="h4 fw-bold mb-1">{{ onyomiLine }}</div>
      </template>
      <template v-else-if="readings.length">
        <div v-for="line in readings" :key="line" class="h4 fw-bold mb-1">{{ line }}</div>
      </template>
      <div v-else class="h4 fw-bold mb-1">
        (no readings yet)
      </div>
    </div>

    <div class="mb-4">
      <div class="h5 text-muted mb-0">
        {{ meanings.length ? meanings.join("; ") : "(no meanings yet)" }}
      </div>
    </div>

    <details>
      <summary class="fw-semibold">Examples</summary>
      <div class="mt-2">
        <div v-if="examples.length === 0" class="text-muted">
          No examples yet.
        </div>
        <div v-else class="list-group">
          <div v-for="ex in examples" :key="`${ex.text}-${ex.reading}`" class="list-group-item">
            <div class="fw-semibold">{{ maskExample(term, maskReading, ex.text) }}</div>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
