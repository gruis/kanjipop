<script setup lang="ts">
import type { Card } from "~/lib/db/schema";
import CardFront from "~/components/CardFront.vue";
import CardBack from "~/components/CardBack.vue";
import {
  fetchKanjiDetails,
  fetchKanjiExamples,
  fetchKanjiCompounds,
  fetchKanjiMnemonics,
  fetchWordDetails,
  addManualExample,
  addManualCompound,
  addManualMnemonic,
  type KanjiCompound,
  type KanjiDetails,
  type KanjiExample,
  type KanjiMnemonic,
  type WordDetails,
} from "~/lib/services/kanjiApi";
import { pickMaskReading } from "~/lib/services/exampleMask";

definePageMeta({
  ssr: false,
});

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const card = ref<Card | null>(null);
const revealed = ref(false);

const details = ref<KanjiDetails | null>(null);
const wordDetails = ref<WordDetails | null>(null);
const examples = ref<KanjiExample[]>([]);
const compounds = ref<KanjiCompound[]>([]);
const mnemonics = ref<KanjiMnemonic[]>([]);

const fetchingDetails = ref(false);
const fetchingExamples = ref(false);
const fetchingCompounds = ref(false);
const fetchingMnemonics = ref(false);
const savingExample = ref(false);
const savingCompound = ref(false);
const savingMnemonic = ref(false);

const newExampleText = ref("");
const newExampleReading = ref("");
const newCompoundWord = ref("");
const newCompoundReading = ref("");
const newCompoundMeaning = ref("");
const newMnemonicKind = ref("meaning");
const newMnemonicText = ref("");

const extractKanji = (term: string) =>
  Array.from(term).filter((char) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(char));

const kanjiLinks = computed(() => {
  if (!card.value || card.value.type !== "vocab") return [] as string[];
  return extractKanji(card.value.term);
});

const readingLines = computed(() => {
  if (card.value?.type === "vocab") {
    return wordDetails.value?.reading ? [`読み: ${wordDetails.value.reading}`] : [];
  }
  if (!details.value) return [] as string[];
  const lines: string[] = [];
  if (details.value.kunyomi?.length) lines.push(`訓: ${details.value.kunyomi.join(" / ")}`);
  if (details.value.onyomi?.length) lines.push(`音: ${details.value.onyomi.join(" / ")}`);
  return lines;
});

const meaningLines = computed(() => {
  if (card.value?.type === "vocab") {
    if (!wordDetails.value?.meaning) return [] as string[];
    return wordDetails.value.meaning.split(/,\s*/g).map((m) => m.trim()).filter(Boolean);
  }
  if (!details.value?.meaning) return [] as string[];
  return details.value.meaning.split(/,\s*/g).map((m) => m.trim()).filter(Boolean);
});

const maskReading = computed(() => {
  if (card.value?.type === "vocab") {
    return wordDetails.value?.reading || "";
  }
  if (!details.value) return "";
  return pickMaskReading(details.value.kunyomi || [], details.value.onyomi || []);
});

const sourceLinks = computed(() => {
  if (!card.value) return [] as Array<{ label: string; href: string }>;
  const encoded = encodeURIComponent(card.value.term);
  const links =
    card.value.type === "vocab"
      ? [
          { label: "Jisho", href: `https://jisho.org/word/${encoded}` },
          { label: "KanjiVG", href: "https://kanjivg.tagaini.net/" },
        ]
      : [
          { label: "Jisho", href: `https://jisho.org/search/${encoded}%23kanji` },
          { label: "KanjiVG", href: "https://kanjivg.tagaini.net/" },
        ];
  if (mnemonics.value.some((m) => m.source === "wanikani")) {
    const wkPath = card.value.type === "vocab" ? "vocabulary" : "kanji";
    links.push({ label: "WaniKani", href: `https://www.wanikani.com/${wkPath}/${encoded}` });
  }
  return links;
});

const loadDetails = async (term: string, refresh = false) => {
  fetchingDetails.value = true;
  try {
    details.value = await fetchKanjiDetails(term, refresh);
  } finally {
    fetchingDetails.value = false;
  }
};

const loadExamples = async (term: string, refresh = false) => {
  fetchingExamples.value = true;
  try {
    examples.value = await fetchKanjiExamples(term, refresh, false);
  } finally {
    fetchingExamples.value = false;
  }
};

const loadCompounds = async (term: string, refresh = false) => {
  fetchingCompounds.value = true;
  try {
    compounds.value = await fetchKanjiCompounds(term, refresh, false);
  } finally {
    fetchingCompounds.value = false;
  }
};

const loadMnemonics = async (term: string, refresh = false, type?: "kanji" | "vocab") => {
  fetchingMnemonics.value = true;
  try {
    mnemonics.value = await fetchKanjiMnemonics(term, refresh, type, false);
  } finally {
    fetchingMnemonics.value = false;
  }
};

const saveExample = async () => {
  if (!card.value) return;
  const text = newExampleText.value.trim();
  if (!text) return;

  savingExample.value = true;
  try {
    await addManualExample(card.value.term, text, newExampleReading.value.trim());
    newExampleText.value = "";
    newExampleReading.value = "";
    await loadExamples(card.value.term, true);
  } finally {
    savingExample.value = false;
  }
};

const saveCompound = async () => {
  if (!card.value) return;
  const word = newCompoundWord.value.trim();
  if (!word) return;
  savingCompound.value = true;
  try {
    await addManualCompound(
      card.value.term,
      word,
      newCompoundReading.value.trim(),
      newCompoundMeaning.value.trim()
    );
    newCompoundWord.value = "";
    newCompoundReading.value = "";
    newCompoundMeaning.value = "";
    await loadCompounds(card.value.term, true);
  } finally {
    savingCompound.value = false;
  }
};

const saveMnemonic = async () => {
  if (!card.value) return;
  const text = newMnemonicText.value.trim();
  if (!text) return;
  savingMnemonic.value = true;
  try {
    await addManualMnemonic(card.value.term, newMnemonicKind.value, text);
    newMnemonicText.value = "";
    await loadMnemonics(card.value.term, true, card.value.type === "vocab" ? "vocab" : "kanji");
  } finally {
    savingMnemonic.value = false;
  }
};

const goBack = () => {
  if (history.length > 1) {
    router.back();
  } else {
    router.push("/cards");
  }
};

const loadCard = async () => {
  loading.value = true;
  const rawId = String(route.params.id || "");
  const id = decodeURIComponent(rawId);

  await $fetch("/api/cards/seed");
  try {
    const res = await $fetch<{ card: Card }>(`/api/cards/${encodeURIComponent(id)}`);
    card.value = res.card || null;
  } catch {
    card.value = null;
  }

  if (card.value) {
    if (card.value.type === "vocab") {
      wordDetails.value = await fetchWordDetails(card.value.term);
      details.value = null;
    } else {
      await loadDetails(card.value.term);
      wordDetails.value = null;
    }
    await loadCompounds(card.value.term);
    await loadMnemonics(card.value.term, false, card.value.type === "vocab" ? "vocab" : "kanji");
    await loadExamples(card.value.term);
  } else {
    details.value = null;
    wordDetails.value = null;
    examples.value = [];
    compounds.value = [];
    mnemonics.value = [];
  }

  loading.value = false;
};

onMounted(() => {
  loadCard();
});

watch(
  () => route.params.id,
  () => loadCard()
);
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h1 class="h3 mb-1">Card Details</h1>
        <p class="text-muted mb-0">Check cards without affecting SRS.</p>
      </div>
      <button class="btn btn-outline-secondary" @click="goBack">Back</button>
    </div>

    <div v-if="loading" class="text-muted">Loading card...</div>

    <div v-else-if="!card" class="alert alert-warning">
      Card not found.
    </div>

    <div v-else class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="badge text-bg-light border text-uppercase">{{ card.type }}</span>
            <span class="ms-2 text-muted">{{ card.id }}</span>
          </div>
          <button class="btn btn-sm btn-outline-secondary reveal-btn" @click="revealed = !revealed" aria-label="Toggle back">
            <span v-if="!revealed" class="icon">↪</span>
            <span v-else class="icon">↩</span>
          </button>
        </div>

        <div class="my-3">
          <CardFront
            v-if="!revealed"
            :term="card.term"
            :readings="readingLines"
            :meanings="meaningLines"
            :mask-reading="maskReading"
            :examples="examples"
          />
          <CardBack
            v-else
            :term="card.term"
            :meta="details ? { strokeCount: details.strokeCount, jlptLevel: details.jlptLevel, taughtIn: details.taughtIn } : null"
            :compounds="compounds"
            :mnemonics="mnemonics"
            :kanji-links="kanjiLinks"
            :open-mnemonics="true"
            :open-compounds="true"
            :source-links="sourceLinks"
          />
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button
            class="btn btn-outline-secondary"
            :disabled="fetchingDetails"
            @click="card && loadDetails(card.term, true)"
          >
            {{ fetchingDetails ? "Refreshing..." : "Refresh details" }}
          </button>

          <button
            class="btn btn-outline-secondary"
            :disabled="fetchingExamples"
            @click="card && loadExamples(card.term, true)"
          >
            {{ fetchingExamples ? "Refreshing..." : "Refresh examples" }}
          </button>

          <button
            class="btn btn-outline-secondary"
            :disabled="fetchingCompounds"
            @click="card && loadCompounds(card.term, true)"
          >
            {{ fetchingCompounds ? "Refreshing..." : "Refresh compounds" }}
          </button>

          <button
            class="btn btn-outline-secondary"
            :disabled="fetchingMnemonics"
            @click="card && loadMnemonics(card.term, true, card.type === 'vocab' ? 'vocab' : 'kanji')"
          >
            {{ fetchingMnemonics ? "Refreshing..." : "Refresh mnemonics" }}
          </button>
        </div>

        <div class="mt-4">
          <div class="card">
            <div class="card-body">
              <h2 class="h6">Add example (manual)</h2>
              <div class="mb-2">
                <input v-model="newExampleText" class="form-control" placeholder="例文" />
              </div>
              <div class="mb-2">
                <input v-model="newExampleReading" class="form-control" placeholder="よみ (optional)" />
              </div>
              <button class="btn btn-outline-primary" :disabled="savingExample" @click="saveExample">
                {{ savingExample ? "Saving..." : "Save example" }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="card">
            <div class="card-body">
              <h2 class="h6">Add compound (manual)</h2>
              <div class="mb-2">
                <input v-model="newCompoundWord" class="form-control" placeholder="単語 / 表現" />
              </div>
              <div class="mb-2">
                <input v-model="newCompoundReading" class="form-control" placeholder="よみ (optional)" />
              </div>
              <div class="mb-2">
                <input v-model="newCompoundMeaning" class="form-control" placeholder="意味 (optional)" />
              </div>
              <button class="btn btn-outline-primary" :disabled="savingCompound" @click="saveCompound">
                {{ savingCompound ? "Saving..." : "Save compound" }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="card">
            <div class="card-body">
              <h2 class="h6">Add mnemonic (manual)</h2>
              <div class="mb-2">
                <select v-model="newMnemonicKind" class="form-select" style="max-width: 220px">
                  <option value="meaning">Meaning</option>
                  <option value="reading">Reading</option>
                </select>
              </div>
              <div class="mb-2">
                <textarea v-model="newMnemonicText" class="form-control" rows="3" placeholder="Mnemonic text"></textarea>
              </div>
              <button class="btn btn-outline-primary" :disabled="savingMnemonic" @click="saveMnemonic">
                {{ savingMnemonic ? "Saving..." : "Save mnemonic" }}
              </button>
            </div>
          </div>
        </div>
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
