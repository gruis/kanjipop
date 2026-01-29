<script setup lang="ts">
const router = useRouter();
const kind = ref<"examples" | "compounds" | "mnemonics">("examples");
const term = ref("");
const visibility = ref("");
const source = ref("");
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);
const items = ref<any[]>([]);
const loading = ref(false);
const message = ref("");

const ensureAdmin = async () => {
  const res = await $fetch<{ user: { role?: string } | null }>("/api/auth/me").catch(() => ({ user: null }));
  if (!res.user) {
    await router.push("/login");
    return false;
  }
  if (res.user.role !== "admin") {
    await router.push("/");
    return false;
  }
  return true;
};

const loadItems = async () => {
  loading.value = true;
  message.value = "";
  try {
    const params = new URLSearchParams();
    params.set("kind", kind.value);
    if (term.value.trim()) params.set("term", term.value.trim());
    if (visibility.value) params.set("visibility", visibility.value);
    if (source.value) params.set("source", source.value);
    params.set("limit", String(pageSize.value));
    params.set("offset", String((page.value - 1) * pageSize.value));

    const res = await $fetch<{ items: any[]; total: number }>(`/api/admin/content?${params}`);
    items.value = res.items || [];
    total.value = res.total || 0;
  } catch (err: any) {
    message.value = err?.data?.error || String(err);
  } finally {
    loading.value = false;
  }
};

const setVisibility = async (id: number, next: string) => {
  await $fetch("/api/admin/content-visibility", {
    method: "POST",
    body: { kind: kind.value, id, visibility: next },
  });
  await loadItems();
};

const toggleVisibility = async (item: any) => {
  const next = item.visibility === "hidden" ? "shared" : "hidden";
  await setVisibility(item.id, next);
};

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

watch([kind, visibility, source], () => {
  page.value = 1;
  loadItems();
});

onMounted(async () => {
  const ok = await ensureAdmin();
  if (ok) await loadItems();
});
</script>

<template>
  <div class="container py-4" style="max-width: 1100px">
    <h1 class="h3 mb-3">Admin Content Curation</h1>
    <p class="text-muted">Browse and hide/show shared content.</p>

    <div class="card mb-4">
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <select v-model="kind" class="form-select" style="max-width: 180px">
            <option value="examples">Examples</option>
            <option value="compounds">Compounds</option>
            <option value="mnemonics">Mnemonics</option>
          </select>
          <input v-model="term" class="form-control" placeholder="Term (exact)" style="max-width: 200px" />
          <select v-model="visibility" class="form-select" style="max-width: 180px">
            <option value="">All visibility</option>
            <option value="shared">Shared</option>
            <option value="personal">Personal</option>
            <option value="hidden">Hidden</option>
          </select>
          <input v-model="source" class="form-control" placeholder="Source" style="max-width: 160px" />
          <button class="btn btn-outline-primary" :disabled="loading" @click="loadItems">
            {{ loading ? "Loading..." : "Apply" }}
          </button>
        </div>
        <p v-if="message" class="text-danger mt-2 mb-0">{{ message }}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="text-muted">{{ total }} items</div>
          <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-sm btn-outline-secondary" :disabled="page <= 1" @click="page--; loadItems()">Prev</button>
            <span class="small">Page {{ page }} / {{ pageCount }}</span>
            <button class="btn btn-sm btn-outline-secondary" :disabled="page >= pageCount" @click="page++; loadItems()">Next</button>
          </div>
        </div>

        <div v-if="items.length === 0" class="text-muted">No items.</div>
        <div v-else class="list-group">
          <div v-for="item in items" :key="item.id" class="list-group-item d-flex justify-content-between align-items-start gap-3">
            <div>
              <div class="fw-semibold" v-if="kind === 'examples'">{{ item.text }}</div>
              <div class="fw-semibold" v-else-if="kind === 'compounds'">{{ item.word }}</div>
              <div class="fw-semibold" v-else>{{ item.kind }}</div>
              <div class="text-muted small" v-if="kind === 'examples'">{{ item.reading }}</div>
              <div class="text-muted small" v-if="kind === 'compounds'">{{ item.reading }} · {{ item.meaning }}</div>
              <div class="text-muted small">Term: {{ item.term }}</div>
              <div class="text-muted small">Source: {{ item.source }}</div>
              <div class="text-muted small">Visibility: {{ item.visibility }}</div>
            </div>
            <button class="btn btn-sm btn-outline-warning" @click="toggleVisibility(item)">
              {{ item.visibility === "hidden" ? "Show" : "Hide" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
