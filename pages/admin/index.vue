<script setup lang="ts">
const router = useRouter();
const me = ref<{ role?: string } | null>(null);
const versionInfo = ref<{ tag?: string | null; version?: string; gitDescribe?: string | null; buildTime?: string | null }>(
  {}
);

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

onMounted(async () => {
  const ok = await ensureAdmin();
  if (ok) await loadVersion();
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <div class="text-center mb-4">
      <img src="/kanjipop_logo_tagline.png" alt="KanjiPop" style="max-width: 360px; width: 100%" />
    </div>
    <h1 class="h3 mb-3">Admin</h1>
    <p class="text-muted">Manage users, shared content, decks, and system settings.</p>

    <div class="row g-4">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h2 class="h5">Users</h2>
            <p class="text-muted">Create and manage adult/kid accounts.</p>
            <NuxtLink class="btn btn-outline-primary mt-auto" to="/admin/users">Go to Users</NuxtLink>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h2 class="h5">Content</h2>
            <p class="text-muted">Approve/hide examples, compounds, and mnemonics.</p>
            <NuxtLink class="btn btn-outline-primary mt-auto" to="/admin/content">Go to Content</NuxtLink>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h2 class="h5">Decks</h2>
            <p class="text-muted">Edit standard deck order and manage shared decks.</p>
            <NuxtLink class="btn btn-outline-primary mt-auto" to="/admin/standard-decks">Go to Decks</NuxtLink>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h2 class="h5">Settings</h2>
            <p class="text-muted">Version info and reset/reseed controls.</p>
            <NuxtLink class="btn btn-outline-primary mt-auto" to="/admin/settings">Go to Settings</NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 text-muted small">
      <div>
        Version: <strong>{{ versionInfo.version || "unknown" }}</strong>
        <span v-if="versionInfo.tag"> (tag {{ versionInfo.tag }})</span>
      </div>
      <div v-if="versionInfo.gitDescribe">Build: {{ versionInfo.gitDescribe }}</div>
      <div v-if="versionInfo.buildTime">Built: {{ versionInfo.buildTime }}</div>
    </div>
  </div>
</template>
