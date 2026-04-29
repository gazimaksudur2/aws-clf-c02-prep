import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { useQuiz } from '../hooks/useQuiz';
import { arraysEqualUnordered } from '../utils/scoring';

export function Quiz() {
  const navigate = useNavigate();
  const { session, answer, skip, next, prev, finish } = useQuiz();

  const current = session?.questions[session.currentIndex] ?? null;

  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  // Reset local state when navigating between questions.
  useEffect(() => {
    if (!current) return;
    const existing = session?.answers[current.id];
    if (existing) {
      setSelected(existing.selectedAnswers);
      setRevealed(true);
    } else {
      setSelected([]);
      setRevealed(false);
    }
  }, [current, session?.answers]);

  // Redirect home if no active session.
  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  const isLast = useMemo(
    () => session && session.currentIndex === session.questions.length - 1,
    [session],
  );

  if (!session || !current) return null;

  const toggleOption = (optId: string) => {
    if (revealed) return;
    setSelected((prev) => {
      if (current.isMultiple) {
        return prev.includes(optId)
          ? prev.filter((x) => x !== optId)
          : [...prev, optId];
      }
      return [optId];
    });
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    answer(current.id, selected);
    setRevealed(true);
  };

  const handleSkip = () => {
    skip(current.id);
    if (isLast) handleFinish();
    else next();
  };

  const handleNext = () => {
    if (isLast) handleFinish();
    else next();
  };

  const handleFinish = () => {
    finish();
    navigate('/results');
  };

  const isCorrect = revealed
    ? arraysEqualUnordered(selected, current.correctAnswers)
    : false;

  return (
    <div className="space-y-6">
      <ProgressBar
        current={session.currentIndex + 1}
        total={session.questions.length}
      />

      <QuestionCard
        question={current}
        selected={selected}
        revealed={revealed}
        onToggleOption={toggleOption}
      />

      {revealed && (
        <div
          className={`card p-4 flex items-start gap-3 animate-slide-up ${
            isCorrect ? 'border-emerald-500/40' : 'border-rose-500/40'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
              isCorrect
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {isCorrect ? '✓' : '✕'}
          </div>
          <div className="flex-1">
            <div
              className={`font-semibold ${
                isCorrect ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </div>
            <div className="text-sm text-slate-300 mt-0.5">
              Correct answer{current.correctAnswers.length > 1 ? 's' : ''}:{' '}
              <span className="font-mono font-semibold text-aws-orange">
                {current.correctAnswers.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={prev}
          disabled={session.currentIndex === 0}
          className="btn-ghost"
        >
          ← Prev
        </button>

        {!revealed ? (
          <>
            <button onClick={handleSkip} className="btn-secondary">
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0}
              className="btn-primary ml-auto"
            >
              Submit Answer
            </button>
          </>
        ) : (
          <button onClick={handleNext} className="btn-primary ml-auto">
            {isLast ? 'Finish Quiz →' : 'Next Question →'}
          </button>
        )}

        <button
          onClick={handleFinish}
          className="btn-ghost text-xs"
          title="End the quiz now"
        >
          End quiz
        </button>
      </div>
    </div>
  );
}
