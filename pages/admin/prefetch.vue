<script setup lang="ts">
const router = useRouter();
const jobId = ref<string | null>(null);
const status = ref<any | null>(null);
const running = ref(false);
const batchSize = ref(10);
const delayMs = ref(300);
const includeExamples = ref(true);
const includeCompounds = ref(true);
const message = ref("");

const ensureAdmin = async () => {
  const res = await $fetch<{ user: { role: string } | null }>("/api/auth/me");
  if (!res.user || res.user.role !== "admin") {
    await router.push("/login");
  }
};

const loadStatus = async () => {
  const res = await $fetch<{ job: any }>("/api/admin/prefetch/status");
  status.value = res.job;
  jobId.value = res.job?.id || null;
};

const startJob = async () => {
  message.value = "";
  const res = await $fetch<{ jobId: string; total: number }>("/api/admin/prefetch/start", { method: "POST" });
  jobId.value = res.jobId;
  await loadStatus();
};

const stepJob = async () => {
  if (!jobId.value) return;
  const res = await $fetch("/api/admin/prefetch/step", {
    method: "POST",
    body: {
      jobId: jobId.value,
      batchSize: batchSize.value,
      delayMs: delayMs.value,
      includeExamples: includeExamples.value,
      includeCompounds: includeCompounds.value,
    },
  });
  status.value = { ...(status.value || {}), ...res };
};

const runLoop = async () => {
  if (running.value) return;
  running.value = true;
  message.value = "";
  while (running.value) {
    await stepJob();
    await loadStatus();
    if (!status.value || status.value.status === "done") {
      running.value = false;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
};

onMounted(async () => {
  await ensureAdmin();
  await loadStatus();
});
</script>

<template>
  <div class="row g-4">
    <div class="col-12">
      <h1 class="h3">Prefetch Card Data</h1>
      <p class="text-muted">Fetch kanji details, examples, and compounds for all decks.</p>
    </div>

    <div class="col-lg-6">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">Settings</h2>
          <div class="mb-2">
            <label class="form-label">Batch size</label>
            <input v-model.number="batchSize" type="number" min="1" max="50" class="form-control" />
          </div>
          <div class="mb-2">
            <label class="form-label">Delay per item (ms)</label>
            <input v-model.number="delayMs" type="number" min="0" max="5000" class="form-control" />
          </div>
          <div class="form-check mb-2">
            <input id="includeExamples" v-model="includeExamples" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="includeExamples">Prefetch examples</label>
          </div>
          <div class="form-check mb-3">
            <input id="includeCompounds" v-model="includeCompounds" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="includeCompounds">Prefetch compounds</label>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-primary" @click="startJob">Start new job</button>
            <button class="btn btn-primary" :disabled="!jobId || running" @click="runLoop">
              {{ running ? "Running..." : "Run until done" }}
            </button>
            <button class="btn btn-outline-secondary" :disabled="!jobId || running" @click="stepJob">Run 1 batch</button>
            <button class="btn btn-outline-danger" :disabled="!running" @click="running = false">Stop</button>
          </div>
          <p v-if="message" class="text-danger mt-2 mb-0">{{ message }}</p>
        </div>
      </div>
    </div>

    <div class="col-lg-6">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">Job Status</h2>
          <div v-if="!status" class="text-muted">No job yet.</div>
          <div v-else>
            <div class="mb-2"><strong>ID:</strong> {{ status.id }}</div>
            <div class="mb-2"><strong>Status:</strong> {{ status.status }}</div>
            <div class="mb-2"><strong>Processed:</strong> {{ status.processed }} / {{ status.total }}</div>
            <div class="mb-2"><strong>Failed:</strong> {{ status.failed }}</div>
            <div class="progress">
              <div
                class="progress-bar"
                role="progressbar"
                :style="{ width: status.total ? Math.round((status.processed / status.total) * 100) + '%' : '0%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
