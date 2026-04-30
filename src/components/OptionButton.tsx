interface Props {
  letter: string;
  text: string;
  selected: boolean;
  /** When true, show correct / incorrect styling (results & browse). */
  showGrading: boolean;
  isCorrect: boolean;
  isIncorrectSelection: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionButton({
  letter,
  text,
  selected,
  showGrading,
  isCorrect,
  isIncorrectSelection,
  onClick,
  disabled,
}: Props) {
  let stateClass =
    'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800';
  if (selected && (!showGrading || !isIncorrectSelection)) {
    stateClass = 'border-aws-orange bg-aws-orange/10 ring-1 ring-aws-orange/40';
  }
  if (showGrading) {
    if (isCorrect) {
      stateClass =
        'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40';
    } else if (isIncorrectSelection) {
      stateClass = 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/40';
    } else {
      stateClass = 'border-slate-800 bg-slate-900/40 opacity-70';
    }
  }

  const letterRing =
    selected || (showGrading && isCorrect)
      ? 'bg-aws-orange text-aws-darker'
      : 'bg-slate-800 text-slate-300';
  const letterGraded =
    showGrading && isCorrect
      ? 'bg-emerald-500 text-white'
      : showGrading && isIncorrectSelection
        ? 'bg-rose-500 text-white'
        : letterRing;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-start gap-3 group ${stateClass} disabled:cursor-default`}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold ${letterGraded}`}
      >
        {letter}
      </span>
      <span className="flex-1 text-sm md:text-base leading-relaxed text-slate-100">
        {text}
      </span>
      {showGrading && isCorrect && (
        <span className="text-emerald-400 text-xs font-semibold mt-1">
          Correct
        </span>
      )}
      {showGrading && isIncorrectSelection && (
        <span className="text-rose-400 text-xs font-semibold mt-1">Wrong</span>
      )}
    </button>
  );
}
