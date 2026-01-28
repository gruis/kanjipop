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
          <p class="display-6 mb-0">0</p>
        </div>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">New Cards</h2>
          <p class="display-6 mb-0">0</p>
        </div>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card">
        <div class="card-body">
          <h2 class="h5">Streak</h2>
          <p class="display-6 mb-0">0</p>
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
