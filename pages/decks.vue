<script setup lang="ts">
import { flattenLevels, formatLevelLabel } from "~/lib/data/levelMeta";
import { createDeck, fetchDecks, fetchDeckItems, type DeckItem, type DeckSummary } from "~/lib/services/decksApi";

const route = useRoute();
const router = useRouter();

const seeded = ref(false);
const activeTaxonomy = ref<"jlpt" | "grade" | "custom">("jlpt");
const search = ref("");
const searchPlaceholder = "日";
const selectedLevel = ref<string | null>(null);

const customDecks = ref<DeckSummary[]>([]);
const selectedDeckId = ref<string>("");
const selectedDeckItems = ref<DeckItem[]>([]);
const showCreateForm = ref(false);
const creatingDeck = ref(false);
const deckName = ref("");
const deckEntries = ref("");
const deckMessage = ref("");

const allLevels = flattenLevels();
const levelsForTaxonomy = computed(() =>
  allLevels.filter((lvl) => lvl.taxonomy === activeTaxonomy.value)
);

const filteredLevels = computed(() => {
  if (activeTaxonomy.value === "custom") return [];
  const termFilter = search.value.trim();
  if (!termFilter) return levelsForTaxonomy.value;
  return levelsForTaxonomy.value.filter((lvl) => lvl.kanji.some((k) => k.includes(termFilter)));
});

const selected = computed(() => {
  if (activeTaxonomy.value === "custom") return null;
  const level = filteredLevels.value.find((lvl) => lvl.id === selectedLevel.value) || filteredLevels.value[0];
  if (!level) return null;

  const termFilter = search.value.trim();
  const kanji = termFilter
    ? level.kanji.filter((k) => k.includes(termFilter))
    : level.kanji;

  return {
    ...level,
    kanji,
  };
});

const customDecksFiltered = computed(() => {
  const term = search.value.trim();
  if (!term) return customDecks.value;
  return customDecks.value.filter((deck) => deck.name.includes(term));
});

const selectedCustomDeck = computed(() => {
  if (!selectedDeckId.value) return null;
  return customDecks.value.find((deck) => deck.id === selectedDeckId.value) || null;
});

const kanjiCardPath = (kanji: string) => `/cards/${encodeURIComponent(`kanji:${kanji}`)}`;

const deckStats = ref<Record<string, { total: number; new: number; learning: number; review: number; relearn: number }>>({});
const customDeckStats = ref<Record<string, { total: number; new: number; learning: number; review: number; relearn: number }>>({});
const stateMap = ref<Record<string, string>>({});

const loadDeckStats = async () => {
  if (activeTaxonomy.value === "custom") return;
  const res = await $fetch<{ stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> }>(
    `/api/review/stats?taxonomy=${activeTaxonomy.value}`
  );
  deckStats.value = res.stats || {};
};

const loadCustomDeckStats = async () => {
  const res = await $fetch<{ stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> }>(
    "/api/decks/stats"
  );
  customDeckStats.value = res.stats || {};
};

const loadStateMap = async (ids: string[]) => {
  if (ids.length === 0) {
    stateMap.value = {};
    return;
  }
  const res = await $fetch<{ states: Record<string, string> }>(
    `/api/review/state?ids=${encodeURIComponent(ids.join(","))}`
  );
  stateMap.value = res.states || {};
};

const chipClassForCard = (cardId: string) => {
  const state = stateMap.value[cardId] || "new";
  return {
    "chip-state-new": state === "new",
    "chip-state-learning": state === "learning",
    "chip-state-review": state === "review",
    "chip-state-relearn": state === "relearn",
  };
};

const percent = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0);

const loadDecks = async () => {
  customDecks.value = await fetchDecks();
  if (!selectedDeckId.value && customDecks.value.length > 0) {
    selectedDeckId.value = customDecks.value[0].id;
  }
};

const loadDeckItems = async () => {
  if (!selectedDeckId.value) {
    selectedDeckItems.value = [];
    return;
  }
  selectedDeckItems.value = await fetchDeckItems(selectedDeckId.value);
  if (activeTaxonomy.value === "custom") {
    if (selectedDeckItems.value.length > 0) {
      const ids = selectedDeckItems.value.map((item) => `${item.type}:${item.term}`);
      await loadStateMap(ids);
    } else {
      stateMap.value = {};
    }
  }
};

const onCreateDeck = async () => {
  const name = deckName.value.trim();
  const entries = deckEntries.value.trim();
  if (!name || !entries) return;

  creatingDeck.value = true;
  deckMessage.value = "";
  try {
    await createDeck(name, entries);
    deckName.value = "";
    deckEntries.value = "";
    deckMessage.value = "Deck created.";
    await loadDecks();
    await loadDeckItems();
    showCreateForm.value = false;
  } catch (err) {
    deckMessage.value = `Failed to create deck: ${String(err)}`;
  } finally {
    creatingDeck.value = false;
  }
};

const setTaxonomy = async (taxonomy: "jlpt" | "grade" | "custom") => {
  activeTaxonomy.value = taxonomy;
  await router.replace({ query: { ...route.query, taxonomy } });
};

onMounted(async () => {
  await $fetch("/api/cards/seed");
  seeded.value = true;
  const requestedTaxonomy = typeof route.query.taxonomy === "string" ? route.query.taxonomy : "";
  if (requestedTaxonomy === "jlpt" || requestedTaxonomy === "grade" || requestedTaxonomy === "custom") {
    activeTaxonomy.value = requestedTaxonomy;
  }
  if (!selectedLevel.value && filteredLevels.value.length > 0) {
    selectedLevel.value = filteredLevels.value[0].id;
  }
  await loadDeckStats();
  await loadCustomDeckStats();
  await loadDecks();
  await loadDeckItems();
  if (selected.value) {
    await loadStateMap(selected.value.kanji.map((k) => `kanji:${k}`));
  }
});

watch(
  () => route.query.taxonomy,
  (taxonomy) => {
    if (typeof taxonomy !== "string") return;
    if (taxonomy === "jlpt" || taxonomy === "grade" || taxonomy === "custom") {
      activeTaxonomy.value = taxonomy;
    }
  }
);

watch([activeTaxonomy, search], async () => {
  if (activeTaxonomy.value !== "custom") {
    if (!selectedLevel.value && filteredLevels.value.length > 0) {
      selectedLevel.value = filteredLevels.value[0].id;
    }
    if (selectedLevel.value && !filteredLevels.value.find((lvl) => lvl.id === selectedLevel.value)) {
      selectedLevel.value = filteredLevels.value[0]?.id || null;
    }
    await loadDeckStats();
    await loadCustomDeckStats();
    if (selected.value) {
      await loadStateMap(selected.value.kanji.map((k) => `kanji:${k}`));
    }
  } else {
    await loadDeckItems();
  }
});

watch(selectedDeckId, async () => {
  await loadDeckItems();
  if (selectedDeckItems.value.length > 0) {
    const ids = selectedDeckItems.value.map((item) => `${item.type}:${item.term}`);
    await loadStateMap(ids);
  } else {
    stateMap.value = {};
  }
});

watch(selectedLevel, async () => {
  if (selected.value) {
    await loadStateMap(selected.value.kanji.map((k) => `kanji:${k}`));
  }
});
</script>

<template>
  <div>
    <h1 class="h3">Decks</h1>
    <p class="text-muted">
      Browse kanji by JLPT or school grade, or create your own custom decks.
    </p>

    <div class="d-flex flex-wrap gap-2 align-items-center mb-4">
      <div class="btn-group" role="group" aria-label="Taxonomy">
        <button
          class="btn"
          :class="activeTaxonomy === 'jlpt' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setTaxonomy('jlpt')"
        >
          JLPT
        </button>
        <button
          class="btn"
          :class="activeTaxonomy === 'grade' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setTaxonomy('grade')"
        >
          Grade
        </button>
        <button
          class="btn"
          :class="activeTaxonomy === 'custom' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setTaxonomy('custom')"
        >
          Custom
        </button>
      </div>

      <div class="input-group" style="max-width: 320px">
        <span class="input-group-text">Search</span>
        <input
          v-model="search"
          class="form-control"
          :placeholder="searchPlaceholder"
          @focus="($event.target as HTMLInputElement).placeholder = ''"
          @blur="($event.target as HTMLInputElement).placeholder = searchPlaceholder"
        />
      </div>

      <span class="text-muted">{{ seeded ? "Seeded" : "Seeding..." }}</span>
    </div>

    <div class="row g-4">
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h2 class="h5">{{ activeTaxonomy === 'custom' ? 'Custom Decks' : 'Levels' }}</h2>

            <div class="list-group" v-if="activeTaxonomy !== 'custom'">
              <button
                v-for="level in filteredLevels"
                :key="level.id"
                type="button"
                class="list-group-item list-group-item-action"
                :class="selectedLevel === level.id ? 'active' : ''"
                @click="selectedLevel = level.id"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <span>{{ formatLevelLabel(level.taxonomy, level.id) }}</span>
                  <span class="badge bg-secondary">{{ level.kanji.length }}</span>
                </div>
                <div
                  class="progress mt-2"
                  style="height: 8px"
                  :title="`New ${deckStats[`${level.taxonomy}:${level.id}`]?.new || 0} · Learning ${deckStats[`${level.taxonomy}:${level.id}`]?.learning || 0} · Review ${deckStats[`${level.taxonomy}:${level.id}`]?.review || 0} · Relearn ${deckStats[`${level.taxonomy}:${level.id}`]?.relearn || 0}`"
                >
                  <div
                    class="progress-bar bg-secondary"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.new || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                  ></div>
                  <div
                    class="progress-bar bg-warning"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.learning || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                  ></div>
                  <div
                    class="progress-bar bg-success"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.review || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                  ></div>
                  <div
                    class="progress-bar bg-danger"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.relearn || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                  ></div>
                </div>
              </button>
            </div>

            <div v-else>
              <div v-if="showCreateForm">
                <p class="text-muted">
                  Enter kanji or compounds separated by spaces, commas, or new lines.
                </p>
                <div class="mb-2">
                  <input v-model="deckName" class="form-control" placeholder="Deck name" />
                </div>
                <div class="mb-2">
                  <textarea
                    v-model="deckEntries"
                    class="form-control"
                    rows="6"
                    placeholder="語 学 読&#10;面積"
                  ></textarea>
                </div>
                <button class="btn btn-outline-primary" :disabled="creatingDeck" @click="onCreateDeck">
                  {{ creatingDeck ? "Creating..." : "Create deck" }}
                </button>
                <button class="btn btn-link ms-2" @click="showCreateForm = false">Cancel</button>
                <p v-if="deckMessage" class="mt-2 mb-0">{{ deckMessage }}</p>
              </div>
              <div v-else>
                <div v-if="customDecksFiltered.length === 0" class="text-muted">
                  No decks yet.
                </div>
                <div v-else class="list-group">
                  <button
                    v-for="deck in customDecksFiltered"
                    :key="deck.id"
                    type="button"
                    class="list-group-item list-group-item-action"
                    :class="selectedDeckId === deck.id ? 'active' : ''"
                    @click="selectedDeckId = deck.id"
                  >
                    <div class="fw-semibold">{{ deck.name }}</div>
                    <div class="progress mt-2" style="height: 6px">
                      <div
                        class="progress-bar bg-secondary"
                        :style="{ width: percent(customDeckStats[deck.id]?.new || 0, customDeckStats[deck.id]?.total || 0) + '%' }"
                      ></div>
                      <div
                        class="progress-bar bg-warning"
                        :style="{ width: percent(customDeckStats[deck.id]?.learning || 0, customDeckStats[deck.id]?.total || 0) + '%' }"
                      ></div>
                      <div
                        class="progress-bar bg-success"
                        :style="{ width: percent(customDeckStats[deck.id]?.review || 0, customDeckStats[deck.id]?.total || 0) + '%' }"
                      ></div>
                      <div
                        class="progress-bar bg-danger"
                        :style="{ width: percent(customDeckStats[deck.id]?.relearn || 0, customDeckStats[deck.id]?.total || 0) + '%' }"
                      ></div>
                    </div>
                  </button>
                </div>
                <button class="btn btn-outline-secondary mt-3" @click="showCreateForm = true">
                  New
                </button>
              </div>
            </div>
          </div>
          <div class="card-footer text-muted">
            {{ seeded ? "Seeded" : "Seeding..." }}
          </div>
        </div>
        <div class="small text-muted mt-2" v-if="activeTaxonomy !== 'custom'">
          Key:
          <span class="badge bg-secondary me-1">New</span>
          <span class="badge bg-warning text-dark me-1">Learning</span>
          <span class="badge bg-success me-1">Review</span>
          <span class="badge bg-danger">Relearn</span>
          <div class="mt-2">
            Colors represent the current SRS stage (not your last button choice). Typical cadence: New = not seen yet;
            Learning = repeats within minutes/hours, then again within ~1–3 days; Review = days → weeks → months as you
            keep succeeding; Relearn = failed reviews that return quickly (minutes/hours) before rejoining Review.
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card h-100">
          <div class="card-body">
            <div v-if="activeTaxonomy !== 'custom'">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 class="h5 mb-0">
                    {{ selected ? formatLevelLabel(selected.taxonomy, selected.id) : "Select a level" }}
                  </h2>
                  <span class="text-muted">
                    {{ selected ? selected.kanji.length : 0 }} kanji
                  </span>
                </div>
                <NuxtLink
                  v-if="selected"
                  class="btn btn-outline-primary"
                  :to="`/review?taxonomy=${selected.taxonomy}&level=${encodeURIComponent(selected.id)}`"
                >
                  Review Deck
                </NuxtLink>
              </div>

              <div v-if="!selected" class="text-muted">Select a level to view kanji.</div>

              <div v-else class="d-flex flex-wrap gap-2" style="min-height: 200px">
                <NuxtLink
                  v-for="k in selected.kanji"
                  :key="k"
                  class="badge text-bg-light border text-decoration-none deck-chip"
                  style="font-size: 1.1rem; padding: 0.5rem 0.75rem"
                  :class="chipClassForCard(`kanji:${k}`)"
                  :to="kanjiCardPath(k)"
                >
                  {{ k }}
                </NuxtLink>
                <span v-if="selected.kanji.length === 0" class="text-muted">
                  No kanji match the current filter.
                </span>
              </div>
            </div>

            <div v-else>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 class="h5 mb-0">Deck Contents</h2>
                  <span class="text-muted" v-if="selectedCustomDeck">
                    {{ selectedDeckItems.length }} items
                  </span>
                </div>
                <NuxtLink
                  v-if="selectedCustomDeck"
                  class="btn btn-outline-primary"
                  :to="`/review?taxonomy=custom&deckId=${encodeURIComponent(selectedCustomDeck.id)}`"
                >
                  Review Deck
                </NuxtLink>
              </div>
              <p v-if="!selectedCustomDeck" class="text-muted mb-0">
                Select a deck to view its items.
              </p>
              <div v-else>
                <div class="text-muted mb-2">{{ selectedCustomDeck.name }}</div>
                <div v-if="selectedDeckItems.length === 0" class="text-muted">
                  No items in this deck yet.
                </div>
                <div v-else class="d-flex flex-wrap gap-2">
                  <NuxtLink
                    v-for="item in selectedDeckItems"
                    :key="`${item.type}:${item.term}`"
                    class="badge text-bg-light border text-decoration-none deck-chip"
                    style="font-size: 1rem; padding: 0.4rem 0.6rem"
                    :class="chipClassForCard(`${item.type}:${item.term}`)"
                    :to="`/cards/${encodeURIComponent(`${item.type}:${item.term}`)}`"
                  >
                    {{ item.term }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-chip {
  --chip-accent: transparent;
  background-image: linear-gradient(transparent calc(100% - 4px), var(--chip-accent) 0);
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
.chip-state-new {
  --chip-accent: transparent;
}
.chip-state-learning {
  --chip-accent: #ffc107;
}
.chip-state-review {
  --chip-accent: #198754;
}
.chip-state-relearn {
  --chip-accent: #dc3545;
}
</style>
