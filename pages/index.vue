<script setup lang="ts">
const stats = ref<{
  dueToday: number;
  newCards: number;
  streak: number;
  buckets: Record<string, number>;
  upcoming: Record<string, number>;
} | null>(null);

const loadStats = async () => {
  try {
    stats.value = await $fetch("/api/dashboard/stats");
  } catch {
    stats.value = null;
  }
};

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="row g-4">
    <div class="col-12">
      <h1 class="h3">Dashboard</h1>
      <p class="text-muted">Welcome back. Start a review or browse decks.</p>
    </div>

    <div class="col-md-4">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">Due Today</h2>
          <p class="display-6 mb-0">{{ stats?.dueToday ?? "—" }}</p>
        </div>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">New Cards</h2>
          <p class="display-6 mb-0">{{ stats?.newCards ?? "—" }}</p>
        </div>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">Streak</h2>
          <p class="display-6 mb-0">{{ stats?.streak ?? "—" }}</p>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h5">SRS Buckets</h2>
          <div class="d-flex flex-wrap gap-3">
            <div>
              <div class="text-muted small">New</div>
              <div class="h4 mb-0">{{ stats?.buckets?.new ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Learning</div>
              <div class="h4 mb-0">{{ stats?.buckets?.learning ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Review</div>
              <div class="h4 mb-0">{{ stats?.buckets?.review ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Relearn</div>
              <div class="h4 mb-0">{{ stats?.buckets?.relearn ?? "—" }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h5">Upcoming Reviews</h2>
          <div class="d-flex flex-wrap gap-3">
            <div>
              <div class="text-muted small">Next 1h</div>
              <div class="h4 mb-0">{{ stats?.upcoming?.h1 ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Next 6h</div>
              <div class="h4 mb-0">{{ stats?.upcoming?.h6 ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Next 24h</div>
              <div class="h4 mb-0">{{ stats?.upcoming?.h24 ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Next 3d</div>
              <div class="h4 mb-0">{{ stats?.upcoming?.d3 ?? "—" }}</div>
            </div>
            <div>
              <div class="text-muted small">Next 7d</div>
              <div class="h4 mb-0">{{ stats?.upcoming?.d7 ?? "—" }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div class="d-flex gap-2">
        <NuxtLink class="btn btn-primary" to="/review">Start Review</NuxtLink>
        <NuxtLink class="btn btn-outline-secondary" to="/decks">Browse Decks</NuxtLink>
      </div>
    </div>
  </div>
</template>
