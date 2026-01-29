<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const userState = useState<{ id: string; email?: string; role?: string; kind?: string; displayName?: string } | null>(
  "currentUser",
  () => null
);

const loadUser = async () => {
  try {
    const res = await $fetch<{ user: typeof userState.value }>("/api/auth/me");
    userState.value = res.user || null;
  } catch {
    userState.value = null;
  }
};

const onLogout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" });
  userState.value = null;
  await router.push("/login");
};

onMounted(() => {
  loadUser();
});

watch(
  () => route.fullPath,
  () => {
    if (!userState.value) loadUser();
  }
);
</script>

<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <NuxtLink class="navbar-brand" to="/">Kanji SRS</NuxtLink>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-if="userState">
            <template v-if="userState.role !== 'admin'">
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/review">Review</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/decks">Decks</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/cards">Cards</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/kanji-wall">Kanji Wall</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/import">Import</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/settings">Settings</NuxtLink>
              </li>
            </template>
            <template v-else>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/decks">Decks</NuxtLink>
              </li>
              <li class="nav-item">
                <NuxtLink class="nav-link" to="/cards">Cards</NuxtLink>
              </li>
            </template>
            <li class="nav-item" v-if="userState?.role === 'admin'">
              <NuxtLink class="nav-link" to="/admin/users">Admin Users</NuxtLink>
            </li>
            <li class="nav-item" v-if="userState?.role === 'admin'">
              <NuxtLink class="nav-link" to="/admin/content">Admin Content</NuxtLink>
            </li>
            <li class="nav-item" v-if="userState?.role === 'admin'">
              <NuxtLink class="nav-link" to="/admin/standard-decks">Admin Decks</NuxtLink>
            </li>
          </ul>
          <div class="d-flex align-items-center gap-2 text-light" v-if="userState">
            <span class="small">{{ userState.displayName || userState.email || userState.kind }}</span>
            <button class="btn btn-sm btn-outline-light" @click="onLogout">Logout</button>
          </div>
        </div>
      </div>
    </nav>

    <main class="container py-4">
      <slot />
    </main>
  </div>
</template>
