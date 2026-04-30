export function ScoreBadge({
  correct,
  total,
  passThresholdPercent,
}: {
  correct: number;
  total: number;
  passThresholdPercent: number;
}) {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= passThresholdPercent;

  return (
    <div
      className={`flex flex-col items-center justify-center w-44 h-44 rounded-full border-4 ${
        passed
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500 bg-rose-500/10 text-rose-300'
      }`}
    >
      <div className="text-5xl font-extrabold tracking-tight">{percent}%</div>
      <div className="text-xs uppercase tracking-widest opacity-80 mt-1">
        {passed ? 'Passed' : 'Keep going'}
      </div>
      <div className="text-xs mt-1 text-slate-400">
        {correct} / {total} correct
      </div>
    </div>
  );
}
