<script setup lang="ts">
import type { Example } from "~/lib/db/schema";

const props = defineProps<{
  examples: Example[];
}>();
</script>

<template>
  <div>
    <h2 class="h6">Examples</h2>
    <div v-if="examples.length === 0" class="text-muted">
      No examples yet. Add some in the editor later.
    </div>
    <div v-else class="list-group">
      <div v-for="ex in examples" :key="ex.id" class="list-group-item">
        <div class="fw-semibold">{{ ex.text }}</div>
        <div v-if="ex.reading" class="text-muted">{{ ex.reading }}</div>
        <div class="small text-muted">Source: {{ ex.source }}</div>
      </div>
    </div>
  </div>
</template>
