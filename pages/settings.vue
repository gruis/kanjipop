<script setup lang="ts">
import { resetDatabase } from "~/lib/db/reset";
import { fetchWaniKaniTokenStatus, saveWaniKaniToken, type WaniKaniTokenStatus } from "~/lib/services/settingsApi";

const db = useDb();
const isResetting = ref(false);
const message = ref("");

const tokenStatus = ref<WaniKaniTokenStatus | null>(null);
const tokenInput = ref("");
const savingToken = ref(false);
const tokenMessage = ref("");

const onReset = async () => {
  if (!confirm("Reset local data and reseed kanji lists? This cannot be undone.")) {
    return;
  }
  isResetting.value = true;
  message.value = "";
  try {
    await resetDatabase(db);
    message.value = "Local database reset and reseeded.";
  } catch (err) {
    message.value = `Reset failed: ${String(err)}`;
  } finally {
    isResetting.value = false;
  }
};

const loadTokenStatus = async () => {
  try {
    tokenStatus.value = await fetchWaniKaniTokenStatus();
  } catch (err) {
    tokenMessage.value = `Failed to load token status: ${String(err)}`;
  }
};

const onSaveToken = async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  savingToken.value = true;
  tokenMessage.value = "";
  try {
    await saveWaniKaniToken(token);
    tokenInput.value = "";
    tokenMessage.value = "Token saved locally.";
    await loadTokenStatus();
  } catch (err) {
    tokenMessage.value = `Failed to save token: ${String(err)}`;
  } finally {
    savingToken.value = false;
  }
};

onMounted(() => {
  loadTokenStatus();
});
</script>

<template>
  <div>
    <h1 class="h3">Settings</h1>
    <p class="text-muted">Storage and backup controls will live here.</p>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5">WaniKani API Token</h2>
        <p class="text-muted">
          Used to fetch mnemonics for your personal study. Stored locally on this device.
        </p>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <input
            v-model="tokenInput"
            type="password"
            class="form-control"
            placeholder="Paste WaniKani token"
            style="max-width: 360px"
          />
          <button class="btn btn-outline-primary" :disabled="savingToken" @click="onSaveToken">
            {{ savingToken ? "Saving..." : "Save token" }}
          </button>
        </div>
        <p class="text-muted mt-2 mb-0">
          Status:
          <span v-if="tokenStatus?.hasToken">Saved</span>
          <span v-else>Not set</span>
        </p>
        <p v-if="tokenMessage" class="mt-2 mb-0">{{ tokenMessage }}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <h2 class="h5">Local Data</h2>
        <p class="text-muted">
          Reset clears local progress and re-seeds the kanji lists from bundled data.
        </p>
        <button class="btn btn-danger" :disabled="isResetting" @click="onReset">
          {{ isResetting ? "Resetting..." : "Reset & Reseed" }}
        </button>
        <p v-if="message" class="mt-3 mb-0">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
