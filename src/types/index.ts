export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: number;
  question: string;
  options: Option[];
  correctAnswers: string[];
  isMultiple: boolean;
  topic: string;
}

export interface AnsweredQuestion {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  skipped: boolean;
}

export interface QuizSession {
  questions: Question[];
  answers: Record<number, AnsweredQuestion>;
  currentIndex: number;
  startedAt: number;
  finishedAt?: number;
}

export interface HistoryEntry {
  id: string;
  startedAt: number;
  finishedAt: number;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  durationSeconds: number;
}
