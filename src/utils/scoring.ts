export function arraysEqualUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/** Default when an exam bank omits a threshold. */
export const PASS_THRESHOLD_PERCENT = 70;

export function isAnswerCorrect(
  selected: string[],
  correctAnswers: string[],
): boolean {
  return arraysEqualUnordered(selected, correctAnswers);
}
