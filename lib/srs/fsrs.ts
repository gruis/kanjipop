import {
  Rating,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type CardInput as FsrsCardInput,
  type RecordLogItem,
} from "ts-fsrs";
import type { ReviewState } from "~/lib/db/schema";

export type Grade = "again" | "hard" | "good" | "easy";

const fsrsInstance = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 3650,
  })
);

const toFsrsState = (state: ReviewState["state"]): State => {
  switch (state) {
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearn":
      return State.Relearning;
    default:
      return State.New;
  }
};

const fromFsrsState = (state: State): ReviewState["state"] => {
  switch (state) {
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearn";
    default:
      return "new";
  }
};

const toFsrsRating = (grade: Grade): Rating => {
  switch (grade) {
    case "again":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "easy":
      return Rating.Easy;
    default:
      return Rating.Good;
  }
};

export const makeInitialReviewState = (cardId: string, now: number): ReviewState => ({
  cardId,
  state: "new",
  difficulty: 0,
  stability: 0,
  retrievability: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  lastReview: null,
  nextDue: now,
  lapses: 0,
  reps: 0,
  createdAt: now,
  updatedAt: now,
});

const toFsrsCard = (state: ReviewState, now: number): FsrsCardInput => {
  return {
    due: new Date(state.nextDue ?? now),
    stability: state.stability || 0,
    difficulty: state.difficulty || 0,
    elapsed_days: state.elapsedDays || 0,
    scheduled_days: state.scheduledDays || 0,
    learning_steps: state.learningSteps || 0,
    reps: state.reps || 0,
    lapses: state.lapses || 0,
    state: toFsrsState(state.state),
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
};

const fromFsrsCard = (cardId: string, card: FsrsCard, now: number): ReviewState => ({
  cardId,
  state: fromFsrsState(card.state),
  difficulty: card.difficulty,
  stability: card.stability,
  retrievability: fsrsInstance.get_retrievability(card, new Date(now), false),
  elapsedDays: card.elapsed_days,
  scheduledDays: card.scheduled_days,
  learningSteps: card.learning_steps,
  lastReview: card.last_review ? card.last_review.getTime() : null,
  nextDue: card.due.getTime(),
  lapses: card.lapses,
  reps: card.reps,
  createdAt: now,
  updatedAt: now,
});

export const reviewWithFsrs = (
  state: ReviewState,
  grade: Grade,
  now: number
): { nextState: ReviewState; record: RecordLogItem } => {
  const card = toFsrsCard(state, now);
  const record = fsrsInstance.next(card, new Date(now), toFsrsRating(grade));
  const nextState = fromFsrsCard(state.cardId, record.card, now);
  return { nextState, record };
};

export const createEmptyFsrsCard = (now: number): FsrsCard => {
  return createEmptyCard(new Date(now));
};
