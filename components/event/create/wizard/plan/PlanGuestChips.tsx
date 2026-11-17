import type { KeyboardEvent, MouseEvent } from 'react';

import type { PlanChipView } from '@/hooks/useCreateEventWizardPlanStep';
import { cn } from '@/lib/utils';

// "How many guests?": one chip per full plan; the picked plan's chip is dark.
export function PlanGuestChips({
    chips,
    labelledBy,
    onSelect,
    onKeyDown,
}: {
    chips: PlanChipView[];
    labelledBy: string;
    onSelect: (planCode: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
    if (chips.length === 0) return null;
    const tabStop = chips.find((chip) => chip.selected)?.planCode ?? chips[0].planCode;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) onSelect(radioId);
    }

    return (
        <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown} className="flex gap-2">
            {chips.map((chip) => (
                <button
                    key={chip.planCode}
                    type="button"
                    role="radio"
                    aria-checked={chip.selected}
                    tabIndex={chip.planCode === tabStop ? 0 : -1}
                    data-radio-id={chip.planCode}
                    onClick={handleClick}
                    className={cn(
                        'h-13 flex-1 rounded-full text-[15px] focus-ring transition-transform active:scale-[0.97] motion-reduce:active:scale-100',
                        chip.selected ? 'bg-ink font-bold text-white' : 'border-[1.5px] border-[#e4d3c0] bg-white font-semibold text-ink',
                    )}
                >
                    {chip.label}
                </button>
            ))}
        </div>
    );
}
