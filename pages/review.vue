<script setup lang="ts">
import type { Card, ReviewState } from "~/lib/db/schema";
import type { Grade } from "~/lib/srs/fsrs";
import CardFront from "~/components/CardFront.vue";
import CardBack from "~/components/CardBack.vue";
import {
  fetchKanjiDetails,
  fetchKanjiExamples,
  fetchKanjiCompounds,
  fetchKanjiMnemonics,
  fetchWordDetails,
  type KanjiCompound,
  type KanjiDetails,
  type KanjiExample,
  type KanjiMnemonic,
  type WordDetails,
} from "~/lib/services/kanjiApi";
import { pickMaskReading } from "~/lib/services/exampleMask";
import { flattenLevels, formatLevelLabel } from "~/lib/data/levelMeta";
import { fetchDecks, type DeckSummary } from "~/lib/services/decksApi";

const route = useRoute();

const loading = ref(true);
const currentCard = ref<Card | null>(null);
const currentState = ref<ReviewState | null>(null);
const revealed = ref(false);
const message = ref("");
const queueReason = ref<"due" | "new" | null>(null);

const kanjiDetails = ref<KanjiDetails | null>(null);
const wordDetails = ref<WordDetails | null>(null);
const examples = ref<KanjiExample[]>([]);
const compounds = ref<KanjiCompound[]>([]);
const mnemonics = ref<KanjiMnemonic[]>([]);

const levelOptions = flattenLevels();
const selectedTaxonomy = ref<"jlpt" | "grade" | "custom">("jlpt");
const selectedLevel = ref<string>("N5");
const decks = ref<DeckSummary[]>([]);
const selectedDeckId = ref<string>("");

const levelTag = computed(() => `${selectedTaxonomy.value}:${selectedLevel.value}`);

const levelsForTaxonomy = computed(() =>
  levelOptions.filter((lvl) => lvl.taxonomy === selectedTaxonomy.value)
);

const extractKanji = (term: string) =>
  Array.from(term).filter((char) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(char));

const kanjiLinks = computed(() => {
  if (!currentCard.value || currentCard.value.type !== "vocab") return [] as string[];
  return extractKanji(currentCard.value.term);
});

watch(
  () => selectedTaxonomy.value,
  () => {
    if (selectedTaxonomy.value === "custom") return;
    const levelIds = levelsForTaxonomy.value.map((lvl) => lvl.id);
    if (selectedLevel.value && levelIds.includes(selectedLevel.value)) return;
    const first = levelsForTaxonomy.value[0];
    if (first) selectedLevel.value = first.id;
  },
  { immediate: true }
);

const readingLines = computed(() => {
  if (currentCard.value?.type === "vocab") {
    return wordDetails.value?.reading ? [`読み: ${wordDetails.value.reading}`] : [];
  }
  if (!kanjiDetails.value) return [] as string[];
  const lines: string[] = [];
  if (kanjiDetails.value.kunyomi?.length) lines.push(`訓: ${kanjiDetails.value.kunyomi.join(" / ")}`);
  if (kanjiDetails.value.onyomi?.length) lines.push(`音: ${kanjiDetails.value.onyomi.join(" / ")}`);
  return lines;
});

const meaningLines = computed(() => {
  if (currentCard.value?.type === "vocab") {
    if (!wordDetails.value?.meaning) return [] as string[];
    return wordDetails.value.meaning.split(/,\s*/g).map((m) => m.trim()).filter(Boolean);
  }
  if (!kanjiDetails.value?.meaning) return [] as string[];
  return kanjiDetails.value.meaning.split(/,\s*/g).map((m) => m.trim()).filter(Boolean);
});

const maskReading = computed(() => {
  if (currentCard.value?.type === "vocab") {
    return wordDetails.value?.reading || "";
  }
  if (!kanjiDetails.value) return "";
  return pickMaskReading(kanjiDetails.value.kunyomi || [], kanjiDetails.value.onyomi || []);
});

const sourceLinks = computed(() => {
  if (!currentCard.value) return [] as Array<{ label: string; href: string }>;
  const encoded = encodeURIComponent(currentCard.value.term);
  const links =
    currentCard.value.type === "vocab"
      ? [
          { label: "Jisho", href: `https://jisho.org/word/${encoded}` },
          { label: "KanjiVG", href: "https://kanjivg.tagaini.net/" },
        ]
      : [
          { label: "Jisho", href: `https://jisho.org/search/${encoded}%23kanji` },
          { label: "KanjiVG", href: "https://kanjivg.tagaini.net/" },
        ];
  if (mnemonics.value.some((m) => m.source === "wanikani")) {
    const wkPath = currentCard.value.type === "vocab" ? "vocabulary" : "kanji";
    links.push({ label: "WaniKani", href: `https://www.wanikani.com/${wkPath}/${encoded}` });
  }
  return links;
});

const loadDetailsForCard = async (card: Card) => {
  kanjiDetails.value = null;
  wordDetails.value = null;
  mnemonics.value = [];
  if (card.type === "vocab") {
    wordDetails.value = await fetchWordDetails(card.term);
    await loadCompounds(card.term);
    await loadMnemonics(card.term, "vocab");
    return;
  }
  kanjiDetails.value = await fetchKanjiDetails(card.term);
  await loadCompounds(card.term);
  await loadMnemonics(card.term, "kanji");
};

const loadExamples = async (term: string) => {
  examples.value = await fetchKanjiExamples(term);
};

const loadCompounds = async (term: string) => {
  compounds.value = await fetchKanjiCompounds(term);
};

const loadMnemonics = async (term: string, type?: "kanji" | "vocab") => {
  mnemonics.value = await fetchKanjiMnemonics(term, false, type);
};

const loadNext = async () => {
  loading.value = true;
  revealed.value = false;
  message.value = "";
  kanjiDetails.value = null;
  wordDetails.value = null;
  examples.value = [];
  compounds.value = [];
  mnemonics.value = [];

  const params = new URLSearchParams();
  if (selectedTaxonomy.value === "custom") {
    if (!selectedDeckId.value) {
      currentCard.value = null;
      currentState.value = null;
      queueReason.value = null;
      loading.value = false;
      return;
    }
    params.set("taxonomy", "custom");
    params.set("deckId", selectedDeckId.value);
  } else {
    params.set("taxonomy", selectedTaxonomy.value);
    params.set("level", selectedLevel.value);
  }

  const result = await $fetch<{ card: Card | null; reviewState: ReviewState | null; reason: "due" | "new" }>(
    `/api/review/next?${params}`
  );

  if (!result.card) {
    currentCard.value = null;
    currentState.value = null;
    queueReason.value = null;
    loading.value = false;
    return;
  }

  currentCard.value = result.card;
  currentState.value = result.reviewState;
  queueReason.value = result.reason;

  await loadDetailsForCard(result.card);
  await loadExamples(result.card.term);

  loading.value = false;
};

const onGrade = async (grade: Grade) => {
  if (!currentCard.value) return;
  try {
    await $fetch("/api/review/grade", {
      method: "POST",
      body: { cardId: currentCard.value.id, grade },
    });
    await loadNext();
  } catch (err) {
    message.value = `Failed to record review: ${String(err)}`;
  }
};

watch(levelTag, async () => {
  if (selectedTaxonomy.value !== "custom") {
    await loadNext();
  }
});

watch(selectedDeckId, async () => {
  if (selectedTaxonomy.value === "custom") {
    await loadNext();
  }
});

watch(
  () => selectedTaxonomy.value,
  async () => {
    if (selectedTaxonomy.value !== "custom") return;
    decks.value = await fetchDecks();
    if (!selectedDeckId.value && decks.value.length > 0) {
      selectedDeckId.value = decks.value[0].id;
    }
    await loadNext();
  }
);

onMounted(async () => {
  await $fetch("/api/cards/seed");
  decks.value = await fetchDecks();

  const requestedTaxonomy = typeof route.query.taxonomy === "string" ? route.query.taxonomy : "";
  const requestedDeckId = typeof route.query.deckId === "string" ? route.query.deckId : "";
  const requestedLevel = typeof route.query.level === "string" ? route.query.level : "";

  if (requestedTaxonomy === "custom") {
    selectedTaxonomy.value = "custom";
    if (requestedDeckId) selectedDeckId.value = requestedDeckId;
  } else if (requestedTaxonomy === "jlpt" || requestedTaxonomy === "grade") {
    selectedTaxonomy.value = requestedTaxonomy;
    if (requestedLevel) selectedLevel.value = requestedLevel;
  }

  if (!selectedDeckId.value && decks.value.length > 0) selectedDeckId.value = decks.value[0].id;
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
            <button
              class="btn"
              :class="selectedTaxonomy === 'custom' ? 'btn-primary' : 'btn-outline-primary'"
              @click="selectedTaxonomy = 'custom'"
            >
              Custom
            </button>
          </div>

          <select
            v-if="selectedTaxonomy !== 'custom'"
            v-model="selectedLevel"
            class="form-select"
            style="max-width: 180px"
          >
            <option v-for="lvl in levelsForTaxonomy" :key="lvl.id" :value="lvl.id">
              {{ formatLevelLabel(lvl.taxonomy, lvl.id) }}
            </option>
          </select>

          <select
            v-else
            v-model="selectedDeckId"
            class="form-select"
            style="max-width: 240px"
          >
            <option v-for="deck in decks" :key="deck.id" :value="deck.id">
              {{ deck.name }}
            </option>
          </select>

          <span class="text-muted" v-if="selectedTaxonomy !== 'custom'">Current deck: {{ levelTag }}</span>
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
            :meta="kanjiDetails ? { strokeCount: kanjiDetails.strokeCount, jlptLevel: kanjiDetails.jlptLevel, taughtIn: kanjiDetails.taughtIn } : null"
            :compounds="compounds"
            :mnemonics="mnemonics"
            :kanji-links="kanjiLinks"
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
