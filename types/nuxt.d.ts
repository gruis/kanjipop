import type { KanjiDb } from "~/lib/db/db";

declare module "#app" {
  interface NuxtApp {
    $db: KanjiDb;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $db: KanjiDb;
  }
}

export {};
