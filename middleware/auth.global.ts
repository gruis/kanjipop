export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const cached = useState<{ id: string } | null>("currentUser", () => null);
  try {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
    const res = await $fetch<{ user: { id: string } | null }>("/api/auth/me", { headers });
    cached.value = res.user || null;
  } catch {
    cached.value = null;
  }

  if (!cached.value) {
    return navigateTo("/login");
  }
});
