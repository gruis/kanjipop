<script setup lang="ts">
import { fetchWaniKaniTokenStatus, saveWaniKaniToken, type WaniKaniTokenStatus } from "~/lib/services/settingsApi";

const tokenStatus = ref<WaniKaniTokenStatus | null>(null);
const tokenInput = ref("");
const savingToken = ref(false);
const tokenMessage = ref("");

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

  </div>
</template>
