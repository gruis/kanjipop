export default defineEventHandler((event) => {
  const user = event.context.user || null;
  if (!user) return { user: null };
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      kind: user.kind,
      displayName: user.displayName || null,
    },
  };
});
