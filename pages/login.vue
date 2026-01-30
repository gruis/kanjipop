<script setup lang="ts">
const mode = ref<"adult" | "kid">("adult");
const email = ref("");
const password = ref("");
const pin = ref("");
const message = ref("");
const loading = ref(false);
const bootstrapEmail = ref("");
const bootstrapPassword = ref("");
const bootstrapName = ref("");
const bootstrapMessage = ref("");
const bootstrapLoading = ref(false);
const hasAdmin = ref<boolean | null>(null);
const router = useRouter();

const loadAdminStatus = async () => {
  try {
    const res = await $fetch<{ hasAdmin: boolean }>("/api/admin/status");
    hasAdmin.value = res.hasAdmin;
  } catch {
    hasAdmin.value = false;
  }
};

const onLogin = async () => {
  message.value = "";
  loading.value = true;
  try {
    if (mode.value === "adult") {
      await $fetch("/api/auth/login", {
        method: "POST",
        body: { type: "adult", email: email.value, password: password.value },
      });
    } else {
      await $fetch("/api/auth/login", {
        method: "POST",
        body: { type: "kid", pin: pin.value },
      });
    }
    await router.push("/");
  } catch (err: any) {
    message.value = err?.data?.error || String(err);
  } finally {
    loading.value = false;
  }
};

const onBootstrap = async () => {
  bootstrapMessage.value = "";
  bootstrapLoading.value = true;
  try {
    await $fetch("/api/admin/bootstrap", {
      method: "POST",
      body: {
        email: bootstrapEmail.value,
        password: bootstrapPassword.value,
        displayName: bootstrapName.value,
      },
    });
    bootstrapMessage.value = "Admin created. You can now log in.";
    await loadAdminStatus();
  } catch (err: any) {
    bootstrapMessage.value = err?.data?.error || String(err);
  } finally {
    bootstrapLoading.value = false;
  }
};

onMounted(() => {
  loadAdminStatus();
});
</script>

<template>
  <div class="container py-4" style="max-width: 720px">
    <div class="text-center mb-4">
      <img src="/kanjipop_logo_tagline.png" alt="KanjiPop" style="max-width: 360px; width: 100%" />
    </div>
    <h1 class="h3 mb-3">Sign in</h1>

    <div v-if="hasAdmin === null" class="text-muted">Checking admin status...</div>

    <template v-else>
      <div v-if="!hasAdmin" class="card">
        <div class="card-body">
          <h2 class="h5">Create Admin (one-time)</h2>
          <p class="text-muted">
            Use this once to bootstrap the admin account. Until an admin exists, logins are disabled.
          </p>
          <div class="mb-2">
            <label class="form-label">Admin email</label>
            <input v-model="bootstrapEmail" type="email" class="form-control" />
          </div>
          <div class="mb-2">
            <label class="form-label">Admin password</label>
            <input v-model="bootstrapPassword" type="password" class="form-control" />
          </div>
          <div class="mb-3">
            <label class="form-label">Display name (optional)</label>
            <input v-model="bootstrapName" type="text" class="form-control" />
          </div>
          <button class="btn btn-outline-secondary" :disabled="bootstrapLoading" @click="onBootstrap">
            {{ bootstrapLoading ? "Creating..." : "Create admin" }}
          </button>
          <p v-if="bootstrapMessage" class="mt-2 mb-0">{{ bootstrapMessage }}</p>
        </div>
      </div>

      <div v-else class="card">
        <div class="card-body">
          <div class="btn-group mb-3" role="group">
            <button
              class="btn"
              :class="mode === 'adult' ? 'btn-primary' : 'btn-outline-primary'"
              @click="mode = 'adult'"
            >
              Adult
            </button>
            <button
              class="btn"
              :class="mode === 'kid' ? 'btn-primary' : 'btn-outline-primary'"
              @click="mode = 'kid'"
            >
              Kid
            </button>
          </div>

          <div v-if="mode === 'adult'">
            <div class="mb-2">
              <label class="form-label">Email</label>
              <input v-model="email" type="email" class="form-control" autocomplete="email" />
            </div>
            <div class="mb-3">
              <label class="form-label">Password</label>
              <input v-model="password" type="password" class="form-control" autocomplete="current-password" />
            </div>
          </div>

          <div v-else>
            <div class="mb-3">
              <label class="form-label">PIN</label>
              <input v-model="pin" type="password" class="form-control" inputmode="numeric" />
            </div>
          </div>

          <button class="btn btn-primary" :disabled="loading" @click="onLogin">
            {{ loading ? "Signing in..." : "Sign in" }}
          </button>
          <p v-if="message" class="text-danger mt-2 mb-0">{{ message }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
