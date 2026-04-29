interface Props {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: Props) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label ?? `Question ${current} of ${total}`}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-aws-orange to-amber-300 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
