import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllQuestions, getAllTopics, useQuiz } from '../hooks/useQuiz';
import { useHistory } from '../hooks/useHistory';
import { PASS_THRESHOLD_PERCENT } from '../utils/scoring';

export function Home() {
  const navigate = useNavigate();
  const { startQuiz } = useQuiz();
  const { stats, history, clear } = useHistory();
  const allQuestions = getAllQuestions();
  const topics = useMemo(() => getAllTopics(), []);

  const [topic, setTopic] = useState('All');
  const pool = useMemo(
    () => (topic === 'All' ? allQuestions : allQuestions.filter((q) => q.topic === topic)),
    [allQuestions, topic],
  );
  const maxCount = pool.length;
  const [count, setCount] = useState(20);

  const handleStart = () => {
    const safeCount = Math.min(count, maxCount);
    startQuiz(safeCount, topic);
    navigate('/quiz');
  };

  const recentScores = history.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="card p-8 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-aws-orange/10 via-transparent to-aws-blue/10 pointer-events-none" />
        <div className="relative">
          <div className="text-xs font-semibold tracking-widest text-aws-orange uppercase">
            AWS Certified Cloud Practitioner · CLF-C02
          </div>
          <h1 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tight">
            Practice. Track. Pass.
          </h1>
          <p className="mt-3 text-slate-300 max-w-2xl">
            597 unique exam-style questions, randomized into custom-length
            quizzes. Pass mark is {PASS_THRESHOLD_PERCENT}% — same as the real
            CLF-C02 exam.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Question Pool" value={allQuestions.length.toString()} hint="Total questions" />
        <StatCard
          label="Quizzes Taken"
          value={stats.totalAttempts.toString()}
          hint="Across all sessions"
        />
        <StatCard
          label="Avg Score"
          value={stats.totalAttempts > 0 ? `${stats.avgScore}%` : '–'}
          hint={
            stats.totalAttempts > 0 ? `Best: ${stats.bestScore}%` : 'No attempts yet'
          }
        />
      </section>

      <section className="card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Start a New Quiz</h2>
          <p className="text-sm text-slate-400">
            Configure your session and we'll randomly pick from the pool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-aws-orange"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t} {t !== 'All' && `(${allQuestions.filter((q) => q.topic === t).length})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Number of Questions
              </label>
              <span className="text-aws-orange font-bold text-lg">
                {Math.min(count, maxCount)}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={maxCount}
              step={1}
              value={Math.min(count, maxCount)}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-3 w-full accent-aws-orange"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5</span>
              <span>{maxCount}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {[10, 20, 50, 100].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              disabled={n > maxCount}
              className={`btn-secondary text-sm ${
                count === n ? 'border-aws-orange text-aws-orange' : ''
              }`}
            >
              {n} questions
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCount(maxCount)}
            className="btn-secondary text-sm"
          >
            All ({maxCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={handleStart} className="btn-primary text-base flex-1">
            Start Quiz →
          </button>
          <button
            onClick={() => navigate('/browse')}
            className="btn-secondary text-base"
          >
            Browse All Questions
          </button>
        </div>
      </section>

      {recentScores.length > 0 && (
        <section className="card p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Attempts</h2>
            <button
              onClick={clear}
              className="text-xs text-slate-500 hover:text-rose-400"
            >
              Clear history
            </button>
          </div>
          <ul className="divide-y divide-slate-800">
            {recentScores.map((h) => (
              <li
                key={h.id}
                className="py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-semibold">
                    {h.correctCount} / {h.totalQuestions} correct
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(h.finishedAt).toLocaleString()} ·{' '}
                    {Math.round(h.durationSeconds / 60)} min
                  </div>
                </div>
                <span
                  className={`text-lg font-bold ${
                    h.scorePercent >= PASS_THRESHOLD_PERCENT
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {h.scorePercent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-aws-orange">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
