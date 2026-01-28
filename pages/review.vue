<script setup lang="ts">
import type { Card, ReviewState } from "~/lib/db/schema";
import { getNextQueueItem } from "~/lib/srs/queue";
import { reviewCard } from "~/lib/srs/review";
import type { Grade } from "~/lib/srs/fsrs";
import CardFront from "~/components/CardFront.vue";
import CardBack from "~/components/CardBack.vue";
import {
  fetchKanjiDetails,
  fetchKanjiExamples,
  fetchKanjiCompounds,
  type KanjiCompound,
  type KanjiDetails,
  type KanjiExample,
} from "~/lib/services/kanjiApi";
import { pickMaskReading } from "~/lib/services/exampleMask";
import { flattenLevels, formatLevelLabel } from "~/lib/data/levelMeta";

const db = useDb();
const loading = ref(true);
const currentCard = ref<Card | null>(null);
const currentState = ref<ReviewState | null>(null);
const revealed = ref(false);
const message = ref("");
const queueReason = ref<"due" | "new" | null>(null);

const details = ref<KanjiDetails | null>(null);
const examples = ref<KanjiExample[]>([]);
const compounds = ref<KanjiCompound[]>([]);

const levelOptions = flattenLevels();
const selectedTaxonomy = ref<"jlpt" | "grade">("jlpt");
const selectedLevel = ref<string>("N5");

const levelTag = computed(() => `${selectedTaxonomy.value}:${selectedLevel.value}`);

const levelsForTaxonomy = computed(() =>
  levelOptions.filter((lvl) => lvl.taxonomy === selectedTaxonomy.value)
);

watch(
  () => selectedTaxonomy.value,
  () => {
    const first = levelsForTaxonomy.value[0];
    if (first) selectedLevel.value = first.id;
  },
  { immediate: true }
);

const readingLines = computed(() => {
  if (!details.value) return [] as string[];
  const lines: string[] = [];
  if (details.value.kunyomi?.length) lines.push(`訓: ${details.value.kunyomi.join(" / ")}`);
  if (details.value.onyomi?.length) lines.push(`音: ${details.value.onyomi.join(" / ")}`);
  return lines;
});

const meaningLines = computed(() => {
  if (!details.value?.meaning) return [] as string[];
  return details.value.meaning.split(/,\s*/g).map((m) => m.trim()).filter(Boolean);
});

const maskReading = computed(() => {
  if (!details.value) return "";
  return pickMaskReading(details.value.kunyomi || [], details.value.onyomi || []);
});

const sourceLinks = computed(() => {
  if (!currentCard.value) return [] as Array<{ label: string; href: string }>;
  const encoded = encodeURIComponent(currentCard.value.term);
  return [
    { label: "Jisho", href: `https://jisho.org/search/${encoded}%23kanji` },
    { label: "KanjiVG", href: "https://kanjivg.tagaini.net/" },
  ];
});

const loadDetails = async (term: string) => {
  details.value = await fetchKanjiDetails(term);
};

const loadExamples = async (term: string) => {
  examples.value = await fetchKanjiExamples(term);
};

const loadCompounds = async (term: string) => {
  compounds.value = await fetchKanjiCompounds(term);
};

const loadNext = async () => {
  loading.value = true;
  revealed.value = false;
  message.value = "";
  details.value = null;
  examples.value = [];
  compounds.value = [];

  const item = await getNextQueueItem(db, Date.now(), levelTag.value);
  if (!item) {
    currentCard.value = null;
    currentState.value = null;
    queueReason.value = null;
    loading.value = false;
    return;
  }

  currentCard.value = item.card;
  currentState.value = item.reviewState;
  queueReason.value = item.reason;

  await loadDetails(item.card.term);
  await loadExamples(item.card.term);
  await loadCompounds(item.card.term);

  loading.value = false;
};

const onGrade = async (grade: Grade) => {
  if (!currentCard.value) return;
  const now = Date.now();
  try {
    await reviewCard(db, currentCard.value, currentState.value, grade, now);
    await loadNext();
  } catch (err) {
    message.value = `Failed to record review: ${String(err)}`;
  }
};

watch(levelTag, async () => {
  await loadNext();
});

onMounted(async () => {
  await loadNext();
});
</script>

<template>
  <div>
    <h1 class="h3">Review</h1>
    <p class="text-muted">FSRS-backed review queue.</p>

    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <div class="btn-group" role="group">
            <button
              class="btn"
              :class="selectedTaxonomy === 'jlpt' ? 'btn-primary' : 'btn-outline-primary'"
              @click="selectedTaxonomy = 'jlpt'"
            >
              JLPT
            </button>
            <button
              class="btn"
              :class="selectedTaxonomy === 'grade' ? 'btn-primary' : 'btn-outline-primary'"
              @click="selectedTaxonomy = 'grade'"
            >
              Grade
            </button>
          </div>

          <select v-model="selectedLevel" class="form-select" style="max-width: 180px">
            <option v-for="lvl in levelsForTaxonomy" :key="lvl.id" :value="lvl.id">
              {{ formatLevelLabel(lvl.taxonomy, lvl.id) }}
            </option>
          </select>

          <span class="text-muted">Current deck: {{ levelTag }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-muted">Loading next card...</div>

    <div v-else-if="!currentCard" class="alert alert-info">
      No cards due right now for this deck.
    </div>

    <div v-else class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="badge text-bg-secondary me-2">{{ queueReason }}</span>
            <span class="badge text-bg-light border text-uppercase">{{ currentCard.type }}</span>
          </div>
          <button class="btn btn-sm btn-outline-secondary reveal-btn" @click="revealed = !revealed" aria-label="Toggle back">
            <span v-if="!revealed" class="icon">↪</span>
            <span v-else class="icon">↩</span>
          </button>
        </div>

        <div class="my-3">
          <CardFront
            v-if="!revealed"
            :term="currentCard.term"
            :readings="readingLines"
            :meanings="meaningLines"
            :mask-reading="maskReading"
            :examples="examples"
          />
          <CardBack
            v-else
            :term="currentCard.term"
            :meta="details ? { strokeCount: details.strokeCount, jlptLevel: details.jlptLevel, taughtIn: details.taughtIn } : null"
            :compounds="compounds"
            :source-links="sourceLinks"
          />
        </div>

        <div v-if="revealed" class="mt-3">
          <div class="d-grid gap-2 d-sm-flex">
            <button class="btn btn-lg btn-danger flex-fill" @click="onGrade('again')">Again</button>
            <button class="btn btn-lg btn-warning flex-fill" @click="onGrade('hard')">Hard</button>
            <button class="btn btn-lg btn-success flex-fill" @click="onGrade('good')">Good</button>
            <button class="btn btn-lg btn-primary flex-fill" @click="onGrade('easy')">Easy</button>
          </div>
        </div>

        <p v-if="message" class="text-danger mt-3 mb-0">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reveal-btn {
  border-radius: 999px;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.reveal-btn:hover {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}
.reveal-btn:active {
  transform: translateY(0) scale(0.98);
}
</style>
