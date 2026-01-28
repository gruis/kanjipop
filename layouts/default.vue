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
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
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
          </ul>
        </div>
      </div>
    </nav>

    <main class="container py-4">
      <slot />
    </main>
  </div>
</template>
