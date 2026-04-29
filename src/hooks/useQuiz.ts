import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import questionsData from '../data/questions.json';
import type { AnsweredQuestion, Question, QuizSession } from '../types';
import { pickRandom } from '../utils/shuffle';
import { arraysEqualUnordered } from '../utils/scoring';

const ALL_QUESTIONS = questionsData as Question[];

export function getAllQuestions(): Question[] {
  return ALL_QUESTIONS;
}

export function getAllTopics(): string[] {
  const set = new Set<string>();
  for (const q of ALL_QUESTIONS) set.add(q.topic);
  return ['All', ...Array.from(set).sort()];
}

interface QuizContextValue {
  session: QuizSession | null;
  startQuiz: (count: number, topic?: string) => void;
  answer: (questionId: number, selected: string[]) => AnsweredQuestion;
  skip: (questionId: number) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  finish: () => QuizSession | null;
  reset: () => void;
  progress: { answered: number; total: number };
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<QuizSession | null>(null);

  const startQuiz = useCallback((count: number, topic?: string) => {
    const pool =
      topic && topic !== 'All'
        ? ALL_QUESTIONS.filter((q) => q.topic === topic)
        : ALL_QUESTIONS;
    const picked = pickRandom(pool, count);
    setSession({
      questions: picked,
      answers: {},
      currentIndex: 0,
      startedAt: Date.now(),
    });
  }, []);

  const answer = useCallback(
    (questionId: number, selected: string[]): AnsweredQuestion => {
      const question = ALL_QUESTIONS.find((q) => q.id === questionId);
      const isCorrect = question
        ? arraysEqualUnordered(selected, question.correctAnswers)
        : false;
      const entry: AnsweredQuestion = {
        questionId,
        selectedAnswers: selected,
        isCorrect,
        skipped: false,
      };
      setSession((s) =>
        s ? { ...s, answers: { ...s.answers, [questionId]: entry } } : s,
      );
      return entry;
    },
    [],
  );

  const skip = useCallback((questionId: number) => {
    setSession((s) =>
      s
        ? {
            ...s,
            answers: {
              ...s.answers,
              [questionId]: {
                questionId,
                selectedAnswers: [],
                isCorrect: false,
                skipped: true,
              },
            },
          }
        : s,
    );
  }, []);

  const next = useCallback(() => {
    setSession((s) =>
      s
        ? {
            ...s,
            currentIndex: Math.min(s.currentIndex + 1, s.questions.length - 1),
          }
        : s,
    );
  }, []);

  const prev = useCallback(() => {
    setSession((s) =>
      s ? { ...s, currentIndex: Math.max(s.currentIndex - 1, 0) } : s,
    );
  }, []);

  const goTo = useCallback((index: number) => {
    setSession((s) =>
      s
        ? {
            ...s,
            currentIndex: Math.max(0, Math.min(index, s.questions.length - 1)),
          }
        : s,
    );
  }, []);

  const finish = useCallback((): QuizSession | null => {
    let finished: QuizSession | null = null;
    setSession((s) => {
      if (!s) return s;
      finished = { ...s, finishedAt: Date.now() };
      return finished;
    });
    return finished;
  }, []);

  const reset = useCallback(() => setSession(null), []);

  const progress = useMemo(() => {
    if (!session) return { answered: 0, total: 0 };
    const answered = Object.values(session.answers).filter((a) => !a.skipped).length;
    return { answered, total: session.questions.length };
  }, [session]);

  const value: QuizContextValue = {
    session,
    startQuiz,
    answer,
    skip,
    next,
    prev,
    goTo,
    finish,
    reset,
    progress,
  };

  return createElement(QuizContext.Provider, { value }, children);
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return ctx;
}
