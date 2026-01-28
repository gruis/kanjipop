<script setup lang="ts">
import { getKanjiChars } from "~/lib/kanji/kanji";
import { getKanjiVgUrls } from "~/lib/kanji/kanjivg";

type StrokeItem = {
  kanji: string;
  urls: string[];
  urlIndex: number;
  failed: boolean;
};

const props = defineProps<{
  term: string;
}>();

const items = ref<StrokeItem[]>([]);

const buildItems = () => {
  const chars = getKanjiChars(props.term);
  items.value = chars.map((kanji) => ({
    kanji,
    urls: getKanjiVgUrls(kanji),
    urlIndex: 0,
    failed: false,
  }));
};

watch(
  () => props.term,
  () => buildItems(),
  { immediate: true }
);

const currentUrl = (item: StrokeItem) => item.urls[item.urlIndex] || null;

const onError = (item: StrokeItem) => {
  if (item.urlIndex < item.urls.length - 1) {
    item.urlIndex += 1;
    return;
  }
  item.failed = true;
};
</script>

<template>
  <div>
    <div v-if="items.length === 0" class="text-muted">
      No kanji found in this card.
    </div>
    <div v-else class="row g-3">
      <div v-for="item in items" :key="item.kanji" class="col-12">
        <div class="card h-100">
          <div class="card-body text-center">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong>{{ item.kanji }}</strong>
              <span v-if="item.failed" class="badge text-bg-warning">Missing</span>
            </div>
            <div v-if="!item.failed && currentUrl(item)">
              <img
                class="img-fluid"
                :src="currentUrl(item)"
                :alt="`${item.kanji} stroke order`"
                style="width: 320px; margin: 0 auto;"
                @error="onError(item)"
              />
            </div>
            <div v-else class="text-muted">
              KanjiVG SVG not available.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
