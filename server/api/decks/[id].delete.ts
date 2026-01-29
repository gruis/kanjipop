import { getRouterParam, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { requireUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const user = requireUser(event);
  const id = getRouterParam(event, "id") || "";
  const db = getDb();

  const deck = db
    .prepare("SELECT id, userId FROM decks WHERE id = ?")
    .get(id) as { id: string; userId: string | null } | undefined;

  if (!deck) {
    setResponseStatus(event, 404);
    return { error: "Deck not found." };
  }

  const isAdmin = user.role === "admin";
  const isOwner = deck.userId && deck.userId === user.id;
  const isShared = deck.userId === null;
  if (!(isOwner || (isAdmin && isShared))) {
    setResponseStatus(event, 403);
    return { error: "Not allowed." };
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM deck_items WHERE deckId = ?").run(id);
    db.prepare("DELETE FROM decks WHERE id = ?").run(id);
  });
  tx();

  return { ok: true };
});
