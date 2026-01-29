import { readBody, setResponseStatus } from "h3";
import { getDb } from "~/server/db/kanjiCache";
import { rowToReviewState, reviewStateToRow } from "~/server/utils/review";
import { makeInitialReviewState, reviewWithFsrs, type Grade } from "~/lib/srs/fsrs";
import { makeId } from "~/lib/srs/ids";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { cardId?: string; grade?: Grade };
  const cardId = body?.cardId || "";
  const grade = body?.grade as Grade;

  if (!cardId || !grade) {
    setResponseStatus(event, 400);
    return { error: "Missing cardId or grade." };
  }

  const db = getDb();
  const cardRow = db.prepare("SELECT * FROM cards WHERE id = ?").get(cardId);
  if (!cardRow) {
    setResponseStatus(event, 404);
    return { error: "Card not found." };
  }

  const stateRow = db.prepare("SELECT * FROM review_states WHERE cardId = ?").get(cardId);
  const now = Date.now();
  const baseState = stateRow ? rowToReviewState(stateRow) : makeInitialReviewState(cardId, now);

  const { nextState, record } = reviewWithFsrs(baseState, grade, now);

  const log = {
    id: makeId(),
    cardId,
    reviewedAt: record.log.review.getTime(),
    grade,
    elapsed: record.log.elapsed_days,
    scheduled: record.log.scheduled_days,
  };

  nextState.createdAt = baseState.createdAt;
  nextState.updatedAt = now;

  const upsertState = db.prepare(
    `INSERT INTO review_states
      (cardId, state, difficulty, stability, retrievability, elapsedDays, scheduledDays, learningSteps, lastReview, nextDue, lapses, reps, createdAt, updatedAt)
     VALUES
      (@cardId, @state, @difficulty, @stability, @retrievability, @elapsedDays, @scheduledDays, @learningSteps, @lastReview, @nextDue, @lapses, @reps, @createdAt, @updatedAt)
     ON CONFLICT(cardId) DO UPDATE SET
      state=excluded.state,
      difficulty=excluded.difficulty,
      stability=excluded.stability,
      retrievability=excluded.retrievability,
      elapsedDays=excluded.elapsedDays,
      scheduledDays=excluded.scheduledDays,
      learningSteps=excluded.learningSteps,
      lastReview=excluded.lastReview,
      nextDue=excluded.nextDue,
      lapses=excluded.lapses,
      reps=excluded.reps,
      updatedAt=excluded.updatedAt
    `
  );

  const insertLog = db.prepare(
    `INSERT INTO review_logs (id, cardId, reviewedAt, grade, elapsed, scheduled)
     VALUES (@id, @cardId, @reviewedAt, @grade, @elapsed, @scheduled)`
  );

  const tx = db.transaction(() => {
    upsertState.run(reviewStateToRow(nextState));
    insertLog.run(log);
  });

  tx();

  return { ok: true, nextState };
});
