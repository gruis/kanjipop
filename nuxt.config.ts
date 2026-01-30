export default defineNuxtConfig({
  compatibilityDate: "2026-01-28",
  css: ["bootstrap/dist/css/bootstrap.min.css"],
  app: {
    head: {
      title: "KanjiPop",
      meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/app-icon.png" },
      ],
    },
  },
  typescript: {
    strict: true,
  },
  vite: {
    server: {
      allowedHosts: ["d32bba38db87.ngrok-free.app"],
    },
  },
});
