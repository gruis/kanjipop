<script setup lang="ts">
const router = useRouter();
const me = ref<{ id: string; role: string } | null>(null);
const users = ref<Array<{ id: string; email?: string; role: string; kind: string; displayName?: string; disabled: number; createdAt: number }>>([]);
const message = ref("");
const loading = ref(false);
const resetMessage = ref("");
const resetting = ref(false);

const adultEmail = ref("");
const adultPassword = ref("");
const adultName = ref("");

const kidPin = ref("");
const kidName = ref("");

const loadUsers = async () => {
  try {
    const res = await $fetch<{ users: typeof users.value }>("/api/admin/users");
    users.value = res.users || [];
  } catch (err: any) {
    message.value = err?.data?.error || String(err);
  }
};

const ensureAdmin = async () => {
  const res = await $fetch<{ user: { id: string; role: string } | null }>("/api/auth/me").catch(() => ({ user: null }));
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

const createAdult = async () => {
  message.value = "";
  loading.value = true;
  try {
    await $fetch("/api/admin/users", {
      method: "POST",
      body: { kind: "adult", email: adultEmail.value, password: adultPassword.value, displayName: adultName.value },
    });
    adultEmail.value = "";
    adultPassword.value = "";
    adultName.value = "";
    await loadUsers();
  } catch (err: any) {
    message.value = err?.data?.error || String(err);
  } finally {
    loading.value = false;
  }
};

const createKid = async () => {
  message.value = "";
  loading.value = true;
  try {
    await $fetch("/api/admin/users", {
      method: "POST",
      body: { kind: "kid", pin: kidPin.value, displayName: kidName.value },
    });
    kidPin.value = "";
    kidName.value = "";
    await loadUsers();
  } catch (err: any) {
    message.value = err?.data?.error || String(err);
  } finally {
    loading.value = false;
  }
};

const toggleDisabled = async (userId: string, disabled: boolean) => {
  await $fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: { disabled },
  });
  await loadUsers();
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
  if (ok) await loadUsers();
});
</script>

<template>
  <div class="container py-4" style="max-width: 960px">
    <h1 class="h3 mb-3">User Management</h1>
    <p class="text-muted">Admin-only: create and manage users.</p>

    <div class="row g-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-body">
            <h2 class="h5">Create Adult</h2>
            <div class="mb-2">
              <label class="form-label">Email</label>
              <input v-model="adultEmail" type="email" class="form-control" />
            </div>
            <div class="mb-2">
              <label class="form-label">Password</label>
              <input v-model="adultPassword" type="password" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Display name</label>
              <input v-model="adultName" type="text" class="form-control" />
            </div>
            <button class="btn btn-outline-primary" :disabled="loading" @click="createAdult">
              Create adult
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card">
          <div class="card-body">
            <h2 class="h5">Create Kid</h2>
            <div class="mb-2">
              <label class="form-label">PIN</label>
              <input v-model="kidPin" type="password" class="form-control" inputmode="numeric" />
            </div>
            <div class="mb-3">
              <label class="form-label">Display name</label>
              <input v-model="kidName" type="text" class="form-control" />
            </div>
            <button class="btn btn-outline-primary" :disabled="loading" @click="createKid">
              Create kid
            </button>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <h2 class="h5">Users</h2>
            <div v-if="users.length === 0" class="text-muted">No users yet.</div>
            <div v-else class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Kind</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id">
                    <td>{{ user.displayName || "(no name)" }}</td>
                    <td>{{ user.email || "-" }}</td>
                    <td>{{ user.kind }}</td>
                    <td>{{ user.role }}</td>
                    <td>
                      <span v-if="user.disabled" class="badge bg-secondary">Disabled</span>
                      <span v-else class="badge bg-success">Active</span>
                    </td>
                    <td>
                      <button
                        v-if="!user.disabled"
                        class="btn btn-sm btn-outline-danger"
                        @click="toggleDisabled(user.id, true)"
                      >
                        Disable
                      </button>
                      <button
                        v-else
                        class="btn btn-sm btn-outline-secondary"
                        @click="toggleDisabled(user.id, false)"
                      >
                        Enable
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="message" class="text-danger mb-0">{{ message }}</p>
          </div>
        </div>
      </div>

      <div class="col-12">
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
    </div>
  </div>
</template>
