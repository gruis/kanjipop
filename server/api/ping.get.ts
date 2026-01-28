export default defineEventHandler(() => {
  console.log("[nitro] /api/ping handler reached");
  return { ok: true, ts: Date.now() };
});
