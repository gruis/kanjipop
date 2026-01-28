export default defineNuxtConfig({
  compatibilityDate: "2026-01-28",
  css: ["bootstrap/dist/css/bootstrap.min.css"],
  app: {
    head: {
      title: "Kanji SRS",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
    },
  },
  typescript: {
    strict: true,
  },
});
