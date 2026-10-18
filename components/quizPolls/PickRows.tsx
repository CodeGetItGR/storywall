'use client';

import { Check, X } from 'lucide-react';
import type React from 'react';

import { percentOf, type PickOption } from '@/lib/quizPolls';
import { cn } from '@/lib/utils';

/**
 * A pick question's options as tappable rows. Once there is a tally each row fills with its share,
 * so the votes live on the options themselves. Once the answer is out the right row is marked.
 */
export function PickRows({
    label,
    options,
    selected,
    correct,
    counts,
    total,
    disabled,
    onPickAction,
}: {
    label: string;
    options: PickOption[];
    selected: string | null;
    correct: string | null;
    counts: Map<string, number> | null;
    total: number;
    disabled: boolean;
    onPickAction: (value: string) => void;
}) {
    function pick(event: React.MouseEvent<HTMLButtonElement>) {
        const value = event.currentTarget.dataset.value;
        if (value) onPickAction(value);
    }

    return (
        <div role="group" aria-label={label} className="flex flex-col gap-2">
            {options.map((option) => {
                const isSelected = selected === option.value;
                const isCorrect = correct !== null && correct === option.value;
                const isWrongPick = correct !== null && isSelected && !isCorrect;
                const percent = counts ? percentOf(counts.get(option.value) ?? 0, total) : null;
                return (
                    <button
                        key={option.value}
                        type="button"
                        data-value={option.value}
                        aria-pressed={isSelected}
                        disabled={disabled}
                        onClick={pick}
                        className={cn(
                            'relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors disabled:cursor-default',
                            isCorrect
                                ? 'border-emerald-400 text-emerald-800'
                                : isWrongPick
                                  ? 'border-rose-300 text-rose-700'
                                  : isSelected
                                    ? 'border-primary text-primary-dark'
                                    : 'border-border text-ink',
                            isSelected && 'font-semibold',
                        )}
                    >
                        {/* Share */}
                        {percent !== null && (
                            <span
                                aria-hidden="true"
                                className={cn('absolute inset-y-0 left-0 transition-all', isSelected ? 'bg-primary-light' : 'bg-surface-muted')}
                                style={{ width: `${percent}%` }}
                            />
                        )}
                        <span className="relative min-w-0 flex-1">{option.label}</span>
                        {isCorrect && <Check className="relative h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                        {isWrongPick && <X className="relative h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />}
                        {percent !== null && <span className="relative shrink-0 text-xs font-semibold tabular-nums">{percent}%</span>}
                    </button>
                );
            })}
        </div>
    );
}
