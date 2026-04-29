interface Props {
  letter: string;
  text: string;
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  isIncorrectSelection: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionButton({
  letter,
  text,
  selected,
  revealed,
  isCorrect,
  isIncorrectSelection,
  onClick,
  disabled,
}: Props) {
  let stateClass =
    'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800';
  if (selected && !revealed) {
    stateClass = 'border-aws-orange bg-aws-orange/10 ring-1 ring-aws-orange/40';
  }
  if (revealed) {
    if (isCorrect) {
      stateClass =
        'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40';
    } else if (isIncorrectSelection) {
      stateClass = 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/40';
    } else {
      stateClass = 'border-slate-800 bg-slate-900/40 opacity-70';
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-start gap-3 group ${stateClass} disabled:cursor-default`}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold ${
          selected || (revealed && isCorrect)
            ? 'bg-aws-orange text-aws-darker'
            : 'bg-slate-800 text-slate-300'
        } ${revealed && isCorrect ? 'bg-emerald-500 text-white' : ''} ${
          revealed && isIncorrectSelection ? 'bg-rose-500 text-white' : ''
        }`}
      >
        {letter}
      </span>
      <span className="flex-1 text-sm md:text-base leading-relaxed text-slate-100">
        {text}
      </span>
      {revealed && isCorrect && (
        <span className="text-emerald-400 text-xs font-semibold mt-1">
          Correct
        </span>
      )}
      {revealed && isIncorrectSelection && (
        <span className="text-rose-400 text-xs font-semibold mt-1">Wrong</span>
      )}
    </button>
  );
}
