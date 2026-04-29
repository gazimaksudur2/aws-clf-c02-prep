import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScoreBadge } from '../components/ScoreBadge';
import { useQuiz } from '../hooks/useQuiz';
import { useHistory } from '../hooks/useHistory';
import { PASS_THRESHOLD_PERCENT } from '../utils/scoring';
import type { HistoryEntry } from '../types';

export function Results() {
  const navigate = useNavigate();
  const { session, reset } = useQuiz();
  const { add } = useHistory();
  const savedRef = useRef(false);

  // Compute summary first so it's available regardless of redirect.
  const summary = useMemo(() => {
    if (!session) return null;
    const total = session.questions.length;
    const answered = Object.values(session.answers);
    const correctCount = answered.filter((a) => a.isCorrect).length;
    const incorrect = answered.filter((a) => !a.isCorrect && !a.skipped);
    const skipped = answered.filter((a) => a.skipped);
    const unanswered = total - answered.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const startedAt = session.startedAt;
    const finishedAt = session.finishedAt ?? Date.now();
    const durationSeconds = Math.max(1, Math.round((finishedAt - startedAt) / 1000));

    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const q of session.questions) {
      const t = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
      t.total += 1;
      const a = session.answers[q.id];
      if (a && a.isCorrect) t.correct += 1;
      byTopic.set(q.topic, t);
    }

    return {
      total,
      correctCount,
      incorrect,
      skipped,
      unanswered,
      scorePercent,
      startedAt,
      finishedAt,
      durationSeconds,
      byTopic: Array.from(byTopic.entries()).sort(
        (a, b) => b[1].total - a[1].total,
      ),
    };
  }, [session]);

  // Persist this attempt exactly once.
  useEffect(() => {
    if (!session || !summary || savedRef.current) return;
    savedRef.current = true;
    const entry: HistoryEntry = {
      id: `${summary.startedAt}-${summary.finishedAt}`,
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      totalQuestions: summary.total,
      correctCount: summary.correctCount,
      scorePercent: summary.scorePercent,
      durationSeconds: summary.durationSeconds,
    };
    add(entry);
  }, [session, summary, add]);

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  if (!session || !summary) return null;

  const passed = summary.scorePercent >= PASS_THRESHOLD_PERCENT;

  return (
    <div className="space-y-8">
      <section className="card p-6 md:p-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreBadge correct={summary.correctCount} total={summary.total} />
          <div className="flex-1 text-center md:text-left">
            <div
              className={`text-xs uppercase tracking-widest font-semibold ${
                passed ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {passed ? 'You passed' : 'Below pass mark'}
            </div>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">
              Quiz Results
            </h1>
            <p className="mt-2 text-slate-400">
              You answered {summary.correctCount} of {summary.total} correctly.
              Pass mark is {PASS_THRESHOLD_PERCENT}%.
            </p>

            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Time" value={`${Math.round(summary.durationSeconds / 60)}m ${summary.durationSeconds % 60}s`} />
              <Stat label="Correct" value={summary.correctCount.toString()} positive />
              <Stat label="Wrong" value={summary.incorrect.length.toString()} negative />
              <Stat
                label="Skipped"
                value={(summary.skipped.length + summary.unanswered).toString()}
              />
            </dl>

            <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
              <button
                onClick={() => {
                  reset();
                  navigate('/');
                }}
                className="btn-primary"
              >
                Take Another Quiz
              </button>
              <button
                onClick={() => navigate('/browse')}
                className="btn-secondary"
              >
                Browse Questions
              </button>
            </div>
          </div>
        </div>
      </section>

      {summary.byTopic.length > 1 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4">Performance by Topic</h2>
          <div className="space-y-3">
            {summary.byTopic.map(([topic, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-200">{topic}</span>
                    <span className="text-slate-400">
                      {stats.correct} / {stats.total} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        pct >= PASS_THRESHOLD_PERCENT
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {summary.incorrect.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4">
            Review Incorrect Answers ({summary.incorrect.length})
          </h2>
          <ul className="space-y-4">
            {summary.incorrect.map((a) => {
              const q = session.questions.find((x) => x.id === a.questionId);
              if (!q) return null;
              return (
                <li
                  key={q.id}
                  className="rounded-xl border border-slate-800 p-4 bg-slate-900/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-aws-orange/15 text-aws-orange font-semibold">
                      {q.topic}
                    </span>
                    <span className="text-xs text-slate-500">#{q.id}</span>
                  </div>
                  <div className="font-semibold text-slate-100 mb-3">
                    {q.question}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-3">
                      <div className="text-xs uppercase tracking-wider text-rose-400 font-semibold mb-1">
                        Your answer
                      </div>
                      <div className="text-slate-200">
                        {a.selectedAnswers.length > 0
                          ? a.selectedAnswers
                              .map(
                                (id) =>
                                  `${id}. ${q.options.find((o) => o.id === id)?.text ?? ''}`,
                              )
                              .join('\n')
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                      <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                        Correct answer
                      </div>
                      <div className="text-slate-200 whitespace-pre-line">
                        {q.correctAnswers
                          .map(
                            (id) =>
                              `${id}. ${q.options.find((o) => o.id === id)?.text ?? ''}`,
                          )
                          .join('\n')}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const valueClass = positive
    ? 'text-emerald-400'
    : negative
      ? 'text-rose-400'
      : 'text-slate-100';
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </dt>
      <dd className={`text-xl font-bold ${valueClass}`}>{value}</dd>
    </div>
  );
}
