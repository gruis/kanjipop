<script setup lang="ts">
import type { Card } from "~/lib/db/schema";
import { seedKanjiIfEmpty } from "~/lib/seed/seedKanji";

const db = useDb();
const loading = ref(true);
const search = ref("");
const typeFilter = ref<"all" | "kanji" | "vocab" | "custom">("kanji");
const cards = ref<Card[]>([]);

const loadCards = async () => {
  loading.value = true;
  await seedKanjiIfEmpty(db);

  const term = search.value.trim();
  let collection = db.cards.toCollection();

  if (typeFilter.value !== "all") {
    collection = db.cards.where("type").equals(typeFilter.value);
  }

  const results = term
    ? await collection.filter((card) => card.term.includes(term)).toArray()
    : await collection.toArray();

  cards.value = results;
  loading.value = false;
};

const cardDetailPath = (cardId: string) => `/cards/${encodeURIComponent(cardId)}`;

watch([search, typeFilter], () => {
  loadCards();
});

onMounted(async () => {
  await loadCards();
});
</script>

<template>
  <div>
    <h1 class="h3">Cards</h1>
    <p class="text-muted">Browse seeded cards. Vocabulary and custom cards will appear after import.</p>

    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <div class="btn-group" role="group">
        <button
          class="btn"
          :class="typeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
          @click="typeFilter = 'all'"
        >
          All
        </button>
        <button
          class="btn"
          :class="typeFilter === 'kanji' ? 'btn-primary' : 'btn-outline-primary'"
          @click="typeFilter = 'kanji'"
        >
          Kanji
        </button>
        <button
          class="btn"
          :class="typeFilter === 'vocab' ? 'btn-primary' : 'btn-outline-primary'"
          @click="typeFilter = 'vocab'"
        >
          Vocab
        </button>
        <button
          class="btn"
          :class="typeFilter === 'custom' ? 'btn-primary' : 'btn-outline-primary'"
          @click="typeFilter = 'custom'"
        >
          Custom
        </button>
      </div>

      <div class="input-group" style="max-width: 320px">
        <span class="input-group-text">Search</span>
        <input v-model="search" class="form-control" placeholder="語" />
      </div>

      <span class="text-muted">{{ loading ? "Loading..." : `${cards.length} cards` }}</span>
    </div>

    <div v-if="loading" class="text-muted">Loading cards...</div>

    <div v-else class="row g-3">
      <div v-for="card in cards" :key="card.id" class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h2 class="h4 mb-0">{{ card.term }}</h2>
              <span class="badge text-bg-secondary text-uppercase">{{ card.type }}</span>
            </div>
            <p class="text-muted mb-2">
              {{ card.reading.length ? card.reading.join(" / ") : "(no reading yet)" }}
            </p>
            <p class="mb-2">
              {{ card.meaning.length ? card.meaning.join("; ") : "(no meaning yet)" }}
            </p>
            <p class="text-muted mb-3">
              {{ card.levels.length ? card.levels.join(", ") : "(no levels)" }}
            </p>
            <NuxtLink class="btn btn-sm btn-outline-secondary" :to="cardDetailPath(card.id)">
              View Details
            </NuxtLink>
          </div>
        </div>
      </div>
      <div v-if="cards.length === 0" class="text-muted">No cards match the current filter.</div>
    </div>
  </div>
</template>
