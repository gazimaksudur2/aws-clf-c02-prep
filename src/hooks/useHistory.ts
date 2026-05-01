import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttemptHistoryEntry, HistoryStoreV2 } from '../types';

export const STORAGE_KEY = 'cert-quiz-history-v2';
const STORAGE_KEY_LEGACY = 'aws-quiz-history';

export function summarizeAttempts(
  entries: AttemptHistoryEntry[],
): AttemptHistoryEntry[] {
  return [...entries].sort((a, b) => b.finishedAt - a.finishedAt);
}

/** Keep only the N most recent finished attempts per certification (`examId`). */
const MAX_ATTEMPTS_PER_EXAM = 10;

export function trimAttemptsPerExam(
  entries: AttemptHistoryEntry[],
): AttemptHistoryEntry[] {
  const byExamId = new Map<string, AttemptHistoryEntry[]>();
  for (const e of entries) {
    const bucket = byExamId.get(e.examId) ?? [];
    bucket.push(e);
    byExamId.set(e.examId, bucket);
  }
  const kept: AttemptHistoryEntry[] = [];
  for (const list of byExamId.values()) {
    kept.push(
      ...summarizeAttempts(list).slice(0, MAX_ATTEMPTS_PER_EXAM),
    );
  }
  return summarizeAttempts(kept);
}

function migrateLegacyAttempts(rawEntries: unknown): AttemptHistoryEntry[] {
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries.filter(Boolean).map((e) => {
    const obj = e as Record<string, unknown>;
    const id =
      typeof obj.id === 'string'
        ? obj.id
        : `${obj.startedAt}-${obj.finishedAt}`;
    return {
      id,
      examId: 'aws-clf-c02',
      examCode: 'CLF-C02',
      examTitle: 'AWS Certified Cloud Practitioner',
      startedAt: Number(obj.startedAt ?? 0),
      finishedAt: Number(obj.finishedAt ?? Date.now()),
      timeLimitSeconds: 0,
      submittedReason: 'manual',
      totalQuestions: Number(obj.totalQuestions ?? 0),
      correctCount: Number(obj.correctCount ?? 0),
      scorePercent: Number(obj.scorePercent ?? 0),
      durationSeconds: Number(obj.durationSeconds ?? 0),
    };
  });
}

function persist(attempts: AttemptHistoryEntry[]) {
  try {
    const envelope: HistoryStoreV2 = { schemaVersion: 2, attempts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota / privacy mode
  }
}

function loadAttempts(): AttemptHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HistoryStoreV2 | AttemptHistoryEntry[];
      if (
        parsed &&
        typeof parsed === 'object' &&
        'schemaVersion' in parsed &&
        Array.isArray((parsed as HistoryStoreV2).attempts)
      ) {
        const rawAttempts = (parsed as HistoryStoreV2).attempts.filter(Boolean);
        const loaded = trimAttemptsPerExam(rawAttempts);
        if (loaded.length !== rawAttempts.length) {
          persist(loaded);
        }
        return loaded;
      }
      if (Array.isArray(parsed)) {
        const migratedFromV2Bare = parsed.every((x): x is AttemptHistoryEntry => {
          if (x === null || typeof x !== 'object') return false;
          return 'examId' in x && 'startedAt' in x && 'finishedAt' in x;
        });
        if (migratedFromV2Bare) {
          const loaded = trimAttemptsPerExam(parsed as AttemptHistoryEntry[]);
          if (loaded.length !== parsed.length) persist(loaded);
          return loaded;
        }
      }
    }
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (legacy) {
      const migrated = trimAttemptsPerExam(
        migrateLegacyAttempts(JSON.parse(legacy)),
      );
      persist(migrated);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      return migrated;
    }
  } catch {
    // ignore
  }
  return [];
}

export function useHistory() {
  const [attempts, setAttempts] = useState<AttemptHistoryEntry[]>([]);

  useEffect(() => {
    setAttempts(loadAttempts());
  }, []);

  const add = useCallback((entry: AttemptHistoryEntry) => {
    setAttempts((prev) => {
      const duplicate = prev.some(
        (h) =>
          h.examId === entry.examId &&
          h.startedAt === entry.startedAt &&
          h.finishedAt === entry.finishedAt,
      );
      if (duplicate) return prev;
      const next = trimAttemptsPerExam(summarizeAttempts([entry, ...prev]));
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    persist([]);
    setAttempts([]);
  }, []);

  const clearExam = useCallback((examId: string) => {
    setAttempts((prev) => {
      const next = trimAttemptsPerExam(
        summarizeAttempts(prev.filter((a) => a.examId !== examId)),
      );
      persist(next);
      return next;
    });
  }, []);

  const statsGlobal = useMemo(() => {
    const attemptsSorted = summarizeAttempts(attempts);
    const n = attemptsSorted.length;
    return {
      totalAttempts: n,
      avgScore:
        n > 0
          ? Math.round(
              attemptsSorted.reduce((s, h) => s + h.scorePercent, 0) / n,
            )
          : 0,
      bestScore: n > 0 ? Math.max(...attemptsSorted.map((h) => h.scorePercent)) : 0,
    };
  }, [attempts]);

  const statsForExam = useCallback(
    (examId: string | null) => {
      if (!examId) return statsGlobal;
      const list = summarizeAttempts(
        attempts.filter((a) => a.examId === examId),
      );
      const n = list.length;
      return {
        totalAttempts: n,
        avgScore:
          n > 0
            ? Math.round(list.reduce((s, h) => s + h.scorePercent, 0) / n)
            : 0,
        bestScore: n > 0 ? Math.max(...list.map((h) => h.scorePercent)) : 0,
      };
    },
    [attempts, statsGlobal],
  );

  const recentForExam = useCallback(
    (examId: string | null, limit = 8) => {
      const list = summarizeAttempts(
        examId ? attempts.filter((a) => a.examId === examId) : attempts,
      );
      return list.slice(0, limit);
    },
    [attempts],
  );

  return {
    attempts,
    add,
    clear,
    clearExam,
    statsGlobal,
    statsForExam,
    recentForExam,
  };
}
