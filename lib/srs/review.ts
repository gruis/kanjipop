import type { Card, ReviewLog, ReviewState } from "~/lib/db/schema";
import type { KanjiDb } from "~/lib/db/db";
import { makeId } from "~/lib/srs/ids";
import { makeInitialReviewState, reviewWithFsrs, type Grade } from "~/lib/srs/fsrs";

export const reviewCard = async (
  db: KanjiDb,
  card: Card,
  existingState: ReviewState | null,
  grade: Grade,
  now: number
) => {
  const baseState = existingState ?? makeInitialReviewState(card.id, now);
  const { nextState, record } = reviewWithFsrs(baseState, grade, now);

  const log: ReviewLog = {
    id: makeId(),
    cardId: card.id,
    reviewedAt: record.log.review.getTime(),
    grade,
    elapsed: record.log.elapsed_days,
    scheduled: record.log.scheduled_days,
  };

  nextState.createdAt = baseState.createdAt;
  nextState.updatedAt = now;

  await db.transaction("rw", db.reviewStates, db.reviewLogs, async () => {
    await db.reviewStates.put(nextState);
    await db.reviewLogs.add(log);
  });

  return { nextState, log };
};
