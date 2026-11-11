import type { KeyboardEvent, MouseEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { TypeChip } from '@/hooks/useCreateEventWizardTypeStep';
import type { EventTypeConvention } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Every enabled type as a photo chip, two per row; the picked one is dark.
export function TypeChips({
    chips,
    labelledBy,
    onSelect,
    onKeyDown,
}: {
    chips: TypeChip[];
    labelledBy: string;
    onSelect: (key: EventTypeConvention) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) onSelect(radioId as EventTypeConvention);
    }

    return (
        <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown} className="grid grid-cols-2 gap-2.5">
            {chips.map((chip) => (
                <button
                    key={chip.key}
                    type="button"
                    role="radio"
                    aria-checked={chip.selected}
                    aria-label={chip.name}
                    tabIndex={chip.selected ? 0 : -1}
                    data-radio-id={chip.key}
                    onClick={handleClick}
                    className={cn(
                        'flex h-13 items-center gap-2 rounded-full border-[1.5px] pr-2.5 pl-1.25 text-left text-[15px] focus-ring transition-transform active:scale-[0.97] motion-reduce:active:scale-100',
                        chip.selected ? 'border-ink bg-ink font-bold text-white' : 'border-[#e4d3c0] bg-white font-semibold text-ink',
                    )}
                >
                    {/* Photo */}
                    <span className="relative size-9.5 shrink-0 overflow-hidden rounded-full">
                        <ProtectedImage src={chip.photoSrc} alt={chip.name} fill sizes="38px" className="object-cover" />
                    </span>
                    {/* Name */}
                    <span className="truncate">{chip.name}</span>
                </button>
            ))}
        </div>
    );
}
