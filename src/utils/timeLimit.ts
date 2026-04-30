/** 2 × minutes × 60 seconds = 120 seconds per question (per requirement). */
export const SECONDS_PER_QUESTION_FOR_TIMER = 120;

export function timeLimitSecondsFromQuestionCount(count: number): number {
  return Math.max(count, 1) * SECONDS_PER_QUESTION_FOR_TIMER;
}
