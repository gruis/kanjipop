import type { KanjiDb } from "~/lib/db/db";

export const useDb = (): KanjiDb => {
  const { $db } = useNuxtApp();
  return $db as KanjiDb;
};
