<script setup lang="ts">
const me = ref<{ role?: string } | null>(null);
import { formatLevelLabel } from "~/lib/data/levelMeta";

const taxonomies = ["jlpt", "grade"] as const;
const activeTaxonomy = ref<"jlpt" | "grade">("grade");
const levels = ref<Array<{ id: string; kanji: string[]; source?: string }>>([]);
const selectedLevel = ref<string>("");
const currentEntries = ref("");
const defaultEntries = ref("");
const source = ref<"default" | "override">("default");
const message = ref("");
const loading = ref(false);
const listItems = ref<string[]>([]);
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const draggingIndex = ref<number | null>(null);
const listContainer = ref<HTMLElement | null>(null);

const loadMe = async () => {
  const res = await $fetch<{ user: { role?: string } | null }>("/api/auth/me").catch(() => ({ user: null }));
  if (!res.user) {
    await navigateTo("/login");
    return;
  }
  if (res.user.role !== "admin") {
    await navigateTo("/");
    return;
  }
  me.value = res.user;
};

const loadLevels = async () => {
  const res = await $fetch<{
    lists: Array<{ taxonomy: "jlpt" | "grade"; levels: Array<{ id: string; kanji: string[]; source?: string }> }>;
  }>(`/api/standard-decks?taxonomy=${activeTaxonomy.value}`);
  const list = res.lists?.[0];
  levels.value = list?.levels || [];
  if (!selectedLevel.value && levels.value.length > 0) {
    selectedLevel.value = levels.value[0].id;
  }
};

const loadLevel = async () => {
  if (!selectedLevel.value) return;
  loading.value = true;
  message.value = "";
  try {
    const res = await $fetch<{
      current: string[];
      default: string[];
      source: "default" | "override";
    }>(`/api/admin/standard-decks?taxonomy=${activeTaxonomy.value}&level=${encodeURIComponent(selectedLevel.value)}`);
    currentEntries.value = (res.current || []).join("\n");
    listItems.value = res.current || [];
    defaultEntries.value = (res.default || []).join("\n");
    source.value = res.source;
  } finally {
    loading.value = false;
  }
};

const saveLevel = async () => {
  if (!selectedLevel.value) return;
  if (!confirm("Save this deck order?")) return;
  message.value = "";
  try {
    await $fetch(`/api/admin/standard-decks?taxonomy=${activeTaxonomy.value}&level=${encodeURIComponent(selectedLevel.value)}`, {
      method: "PATCH",
      body: { entries: currentEntries.value },
    });
    message.value = "Saved.";
    await loadLevels();
    await loadLevel();
  } catch (err) {
    message.value = `Save failed: ${String(err)}`;
  }
};

const resetLevel = async () => {
  if (!selectedLevel.value) return;
  if (!confirm("Reset this level to the default order?")) return;
  message.value = "";
  try {
    await $fetch(`/api/admin/standard-decks?taxonomy=${activeTaxonomy.value}&level=${encodeURIComponent(selectedLevel.value)}`, {
      method: "DELETE",
    });
    message.value = "Reset to default.";
    await loadLevels();
    await loadLevel();
  } catch (err) {
    message.value = `Reset failed: ${String(err)}`;
  }
};

const syncEntriesFromList = () => {
  currentEntries.value = listItems.value.join("\n");
};

const onDragStart = (index: number, event: DragEvent) => {
  dragIndex.value = index;
  draggingIndex.value = index;
  event.dataTransfer?.setData("text/plain", String(index));
  event.dataTransfer?.setDragImage(event.currentTarget as Element, 10, 10);
};

const onDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  dragOverIndex.value = index;
  const container = listContainer.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const edge = 40;
  if (event.clientY < rect.top + edge) {
    container.scrollTop -= 10;
  } else if (event.clientY > rect.bottom - edge) {
    container.scrollTop += 10;
  }
};

const onDrop = (index: number) => {
  if (dragIndex.value === null || dragIndex.value === index) return;
  const items = [...listItems.value];
  const [moved] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, moved);
  listItems.value = items;
  dragIndex.value = null;
  dragOverIndex.value = null;
  draggingIndex.value = null;
  syncEntriesFromList();
};

const onDragEnd = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
  draggingIndex.value = null;
};

watch(currentEntries, () => {
  const next = currentEntries.value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  listItems.value = next;
});

watch(activeTaxonomy, async () => {
  selectedLevel.value = "";
  await loadLevels();
  await loadLevel();
});

watch(selectedLevel, async () => {
  await loadLevel();
});

onMounted(async () => {
  await loadMe();
  await loadLevels();
  await loadLevel();
});
</script>

<template>
  <div>
    <h1 class="h3">Admin Decks</h1>
    <p class="text-muted">
      Edit the order of standard decks. New review cards will follow this order for the selected level.
    </p>

    <div class="row g-3">
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Deck Type</label>
              <select class="form-select" v-model="activeTaxonomy">
                <option v-for="tax in taxonomies" :key="tax" :value="tax">
                  {{ tax.toUpperCase() }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Level</label>
              <select class="form-select" v-model="selectedLevel">
                <option v-for="level in levels" :key="level.id" :value="level.id">
                  {{ formatLevelLabel(activeTaxonomy, level.id) }}
                </option>
              </select>
            </div>
            <div class="small text-muted mt-2">
              Source: <strong>{{ source === "override" ? "Custom" : "Default" }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h2 class="h6 mb-0">Order</h2>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary" @click="resetLevel" :disabled="loading">
                  Reset to Default
                </button>
                <button class="btn btn-primary" @click="saveLevel" :disabled="loading">
                  Save
                </button>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-lg-9">
                <div class="small text-muted mb-2">Drag to reorder</div>
                <div ref="listContainer" class="deck-chip-grid">
                  <div
                    v-for="(item, index) in listItems"
                    :key="`${item}-${index}`"
                    class="deck-chip"
                    :class="{
                      'is-dragging': draggingIndex === index,
                      'is-drop-target': dragOverIndex === index,
                    }"
                    draggable="true"
                    @dragstart="onDragStart(index, $event)"
                    @dragover="onDragOver($event, index)"
                    @drop="onDrop(index)"
                    @dragend="onDragEnd"
                  >
                    <span class="chip-label">{{ item }}</span>
                  </div>
                </div>
              </div>
              <div class="col-lg-3">
                <div class="small text-muted mb-2">One kanji per line</div>
                <textarea class="form-control" rows="12" v-model="currentEntries"></textarea>
              </div>
            </div>
            <div class="small text-muted mt-2">
              Tip: paste your school list here to align the review order. The list must include every kanji for the level.
            </div>
            <div v-if="message" class="small text-muted mt-2">{{ message }}</div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-body">
            <h2 class="h6">Default Order (read-only)</h2>
            <textarea class="form-control" rows="8" :value="defaultEntries" readonly></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fbfcfe;
}
.deck-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.5rem;
  border: 1px solid #d0d7de;
  border-radius: 0.4rem;
  background: #fff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  width: 3rem;
  height: 3rem;
}
.deck-chip.is-dragging {
  opacity: 0.5;
}
.deck-chip.is-drop-target {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
}
.chip-label {
  font-weight: 600;
  text-align: center;
}
.deck-chip:active {
  cursor: grabbing;
}
</style>
