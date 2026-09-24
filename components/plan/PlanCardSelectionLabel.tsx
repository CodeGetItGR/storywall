import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// A plan card's "choose / selected" state, drawn as a button. The card's
// stretched select button takes the tap; this only shows the state.
export function PlanCardSelectionLabel({ label, selected }: { label: string; selected: boolean }) {
    return (
        <p
            className={cn(
                'mt-5 flex min-h-11 items-center justify-center gap-2 rounded-full border text-[12px] font-black tracking-[.12em] transition-colors',
                selected ? 'border-[#151313] bg-[#151313] text-white' : 'border-[#151313]/25 group-hover:border-[#151313]/60',
            )}
        >
            {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
            {label}
        </p>
    );
}
