const allowedHosts = (process.env.NUXT_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

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
      allowedHosts: allowedHosts.length > 0 ? allowedHosts : "all",
    },
  },
});
