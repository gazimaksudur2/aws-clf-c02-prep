import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntry } from '../types';

const STORAGE_KEY = 'aws-quiz-history';

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota errors / disabled storage.
  }
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const add = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, []);

  const stats = {
    totalAttempts: history.length,
    avgScore:
      history.length > 0
        ? Math.round(
            history.reduce((s, h) => s + h.scorePercent, 0) / history.length,
          )
        : 0,
    bestScore:
      history.length > 0
        ? Math.max(...history.map((h) => h.scorePercent))
        : 0,
  };

  return { history, add, clear, stats };
}
