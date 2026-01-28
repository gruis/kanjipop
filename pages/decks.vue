<script setup lang="ts">
import { seedKanjiIfEmpty } from "~/lib/seed/seedKanji";
import { flattenLevels, formatLevelLabel } from "~/lib/data/levelMeta";

const db = useDb();
const seeded = ref(false);
const activeTaxonomy = ref<"jlpt" | "grade">("jlpt");
const search = ref("");
const selectedLevel = ref<string | null>(null);

const allLevels = flattenLevels();
const levelsForTaxonomy = computed(() =>
  allLevels.filter((lvl) => lvl.taxonomy === activeTaxonomy.value)
);

const selected = computed(() => {
  const level = levelsForTaxonomy.value.find((lvl) => lvl.id === selectedLevel.value);
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

const kanjiCardPath = (kanji: string) => `/cards/${encodeURIComponent(`kanji:${kanji}`)}`;

const deckStats = ref<Record<string, { total: number; new: number; learning: number; review: number; relearn: number }>>({});

const computeDeckStats = async () => {
  const reviewStates = await db.reviewStates.toArray();
  const stateByCard = new Map(reviewStates.map((s) => [s.cardId, s.state]));

  const stats: Record<string, { total: number; new: number; learning: number; review: number; relearn: number }> = {};

  for (const level of levelsForTaxonomy.value) {
    const key = `${level.taxonomy}:${level.id}`;
    let total = 0;
    let newCount = 0;
    let learning = 0;
    let review = 0;
    let relearn = 0;

    for (const k of level.kanji) {
      total += 1;
      const state = stateByCard.get(`kanji:${k}`);
      if (!state) {
        newCount += 1;
      } else if (state === "learning") {
        learning += 1;
      } else if (state === "review") {
        review += 1;
      } else if (state === "relearn") {
        relearn += 1;
      }
    }

    stats[key] = { total, new: newCount, learning, review, relearn };
  }

  deckStats.value = stats;
};

const percent = (count: number, total: number) => (total ? Math.round((count / total) * 100) : 0);

onMounted(async () => {
  await seedKanjiIfEmpty(db);
  seeded.value = true;
  if (!selectedLevel.value && levelsForTaxonomy.value.length > 0) {
    selectedLevel.value = levelsForTaxonomy.value[0].id;
  }
  await computeDeckStats();
});

watch(activeTaxonomy, async () => {
  await computeDeckStats();
});
</script>

<template>
  <div>
    <h1 class="h3">Decks</h1>
    <p class="text-muted">
      Browse kanji by JLPT or school grade. This is a static level view; SRS
      progress will be layered on top later.
    </p>

    <div class="d-flex flex-wrap gap-2 align-items-center mb-4">
      <div class="btn-group" role="group" aria-label="Taxonomy">
        <button
          class="btn"
          :class="activeTaxonomy === 'jlpt' ? 'btn-primary' : 'btn-outline-primary'"
          @click="activeTaxonomy = 'jlpt'"
        >
          JLPT
        </button>
        <button
          class="btn"
          :class="activeTaxonomy === 'grade' ? 'btn-primary' : 'btn-outline-primary'"
          @click="activeTaxonomy = 'grade'"
        >
          Grade
        </button>
      </div>

      <div class="input-group" style="max-width: 320px">
        <span class="input-group-text">Search</span>
        <input v-model="search" class="form-control" placeholder="日" />
      </div>

      <span class="text-muted">{{ seeded ? "Seeded" : "Seeding..." }}</span>
    </div>

    <div class="row g-4">
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h2 class="h5">Levels</h2>
            <div class="list-group">
              <button
                v-for="level in levelsForTaxonomy"
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
                <div class="progress mt-2" style="height: 8px">
                  <div
                    class="progress-bar bg-secondary"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.new || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                    title="New"
                  ></div>
                  <div
                    class="progress-bar bg-warning"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.learning || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                    title="Learning"
                  ></div>
                  <div
                    class="progress-bar bg-success"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.review || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                    title="Review"
                  ></div>
                  <div
                    class="progress-bar bg-danger"
                    :style="{ width: percent(deckStats[`${level.taxonomy}:${level.id}`]?.relearn || 0, deckStats[`${level.taxonomy}:${level.id}`]?.total || 0) + '%' }"
                    title="Relearn"
                  ></div>
                </div>
              </button>
            </div>
          </div>
          <div class="card-footer text-muted">
            {{ seeded ? "Seeded" : "Seeding..." }}
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">
                {{ selected ? `${selected.taxonomy.toUpperCase()} ${selected.id}` : "Select a level" }}
              </h2>
              <span class="text-muted">
                {{ selected ? selected.kanji.length : 0 }} kanji
              </span>
            </div>

            <div v-if="!selected" class="text-muted">Select a level to view kanji.</div>

            <div v-else class="d-flex flex-wrap gap-2" style="min-height: 200px">
              <NuxtLink
                v-for="k in selected.kanji"
                :key="k"
                class="badge text-bg-light border text-decoration-none"
                style="font-size: 1.1rem; padding: 0.5rem 0.75rem"
                :to="kanjiCardPath(k)"
              >
                {{ k }}
              </NuxtLink>
              <span v-if="selected.kanji.length === 0" class="text-muted">
                No kanji match the current filter.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
