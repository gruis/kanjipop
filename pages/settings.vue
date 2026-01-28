<script setup lang="ts">
import { resetDatabase } from "~/lib/db/reset";

const db = useDb();
const isResetting = ref(false);
const message = ref("");

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
</script>

<template>
  <div>
    <h1 class="h3">Settings</h1>
    <p class="text-muted">Storage and backup controls will live here.</p>

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
