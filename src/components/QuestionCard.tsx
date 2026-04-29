import type { Question } from '../types';
import { OptionButton } from './OptionButton';

interface Props {
  question: Question;
  selected: string[];
  revealed: boolean;
  onToggleOption: (id: string) => void;
}

export function QuestionCard({
  question,
  selected,
  revealed,
  onToggleOption,
}: Props) {
  return (
    <div className="card p-6 md:p-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-aws-orange/15 text-aws-orange font-semibold">
          {question.topic}
        </span>
        {question.isMultiple && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-aws-blue/20 text-sky-300 font-semibold">
            Multi-answer · choose {question.correctAnswers.length}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">#{question.id}</span>
      </div>

      <h2 className="text-lg md:text-xl font-semibold leading-snug mb-6">
        {question.question}
      </h2>

      <div className="space-y-2.5">
        {question.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const isCorrect = question.correctAnswers.includes(opt.id);
          return (
            <OptionButton
              key={opt.id}
              letter={opt.id}
              text={opt.text}
              selected={isSelected}
              revealed={revealed}
              isCorrect={isCorrect}
              isIncorrectSelection={revealed && isSelected && !isCorrect}
              onClick={() => onToggleOption(opt.id)}
              disabled={revealed}
            />
          );
        })}
      </div>
    </div>
  );
}
