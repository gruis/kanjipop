import type { ReviewState } from "~/lib/db/schema";

export const rowToReviewState = (row: any): ReviewState => ({
  cardId: row.cardId,
  state: row.state,
  difficulty: row.difficulty || 0,
  stability: row.stability || 0,
  retrievability: row.retrievability || 0,
  elapsedDays: row.elapsedDays || 0,
  scheduledDays: row.scheduledDays || 0,
  learningSteps: row.learningSteps || 0,
  lastReview: row.lastReview ?? null,
  nextDue: row.nextDue ?? null,
  lapses: row.lapses || 0,
  reps: row.reps || 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const reviewStateToRow = (state: ReviewState) => ({
  cardId: state.cardId,
  state: state.state,
  difficulty: state.difficulty,
  stability: state.stability,
  retrievability: state.retrievability,
  elapsedDays: state.elapsedDays,
  scheduledDays: state.scheduledDays,
  learningSteps: state.learningSteps,
  lastReview: state.lastReview,
  nextDue: state.nextDue,
  lapses: state.lapses,
  reps: state.reps,
  createdAt: state.createdAt,
  updatedAt: state.updatedAt,
});
