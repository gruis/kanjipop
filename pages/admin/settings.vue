<script setup lang="ts">
const router = useRouter();
const me = ref<{ role?: string } | null>(null);
const versionInfo = ref<{ tag?: string | null; version?: string; gitDescribe?: string | null; buildTime?: string | null }>(
  {}
);
const resetMessage = ref("");
const resetting = ref(false);

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
  me.value = res.user;
  return true;
};

const loadVersion = async () => {
  try {
    versionInfo.value = await $fetch("/api/version");
  } catch {
    versionInfo.value = {};
  }
};

const onReset = async () => {
  if (!confirm("Reset server data and reseed kanji lists? This cannot be undone.")) {
    return;
  }
  resetting.value = true;
  resetMessage.value = "";
  try {
    await $fetch("/api/admin/reset", { method: "POST" });
    resetMessage.value = "Server data reset and reseeded.";
  } catch (err: any) {
    resetMessage.value = err?.data?.error || String(err);
  } finally {
    resetting.value = false;
  }
};

onMounted(async () => {
  const ok = await ensureAdmin();
  if (ok) await loadVersion();
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <h1 class="h3 mb-3">Admin Settings</h1>
    <p class="text-muted">Admin-only configuration and maintenance tasks.</p>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5">App Version</h2>
        <p class="text-muted mb-1">
          Version: <strong>{{ versionInfo.version || "unknown" }}</strong>
          <span v-if="versionInfo.tag"> (tag {{ versionInfo.tag }})</span>
        </p>
        <p v-if="versionInfo.gitDescribe" class="text-muted mb-1">
          Build: {{ versionInfo.gitDescribe }}
        </p>
        <p v-if="versionInfo.buildTime" class="text-muted mb-0">
          Built: {{ versionInfo.buildTime }}
        </p>
      </div>
    </div>

    <div class="card border-danger">
      <div class="card-body">
        <h2 class="h5 text-danger">Reset & Reseed</h2>
        <p class="text-muted">
          This clears all server-side progress and reseeds the kanji lists. This cannot be undone.
        </p>
        <button class="btn btn-danger" :disabled="resetting" @click="onReset">
          {{ resetting ? "Resetting..." : "Reset & Reseed" }}
        </button>
        <p v-if="resetMessage" class="mt-2 mb-0">{{ resetMessage }}</p>
      </div>
    </div>
  </div>
</template>
