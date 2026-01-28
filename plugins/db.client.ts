import { createDb } from "~/lib/db/db";

export default defineNuxtPlugin(() => {
  const db = createDb();
  return {
    provide: {
      db,
    },
  };
});
