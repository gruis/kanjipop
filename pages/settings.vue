<script setup lang="ts">
import { fetchWaniKaniTokenStatus, saveWaniKaniToken, type WaniKaniTokenStatus } from "~/lib/services/settingsApi";

const tokenStatus = ref<WaniKaniTokenStatus | null>(null);
const tokenInput = ref("");
const savingToken = ref(false);
const tokenMessage = ref("");
const versionInfo = ref<{ tag?: string | null; version?: string; gitDescribe?: string | null; buildTime?: string | null }>(
  {}
);

const loadTokenStatus = async () => {
  try {
    tokenStatus.value = await fetchWaniKaniTokenStatus();
  } catch (err) {
    tokenMessage.value = `Failed to load token status: ${String(err)}`;
  }
};

const loadVersion = async () => {
  try {
    versionInfo.value = await $fetch("/api/version");
  } catch {
    versionInfo.value = {};
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
  loadVersion();
});
</script>

<template>
  <div>
    <div class="text-center mb-4">
      <img src="/kanjipop_logo_tagline.png" alt="KanjiPop" style="max-width: 360px; width: 100%" />
    </div>
    <h1 class="h3">Settings</h1>
    <p class="text-muted">Storage and backup controls will live here.</p>

    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5">WaniKani API Token</h2>
        <p class="text-muted">
          Used to fetch mnemonics for your personal study. Stored on the server for your account.
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
  </div>
</template>
