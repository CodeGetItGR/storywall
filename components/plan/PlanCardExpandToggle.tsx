import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Mobile-only arrow that shows and hides a plan card's feature list. It sits
// above the card's stretched select button, so tapping it doesn't pick the plan.
export function PlanCardExpandToggle({
    open,
    controlsId,
    expandLabel,
    collapseLabel,
    onToggleAction,
}: {
    open: boolean;
    controlsId: string;
    expandLabel: string;
    collapseLabel: string;
    onToggleAction: () => void;
}) {
    return (
        <div className="flex justify-end min-[761px]:hidden">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={controlsId}
                aria-label={open ? collapseLabel : expandLabel}
                onClick={onToggleAction}
                className="relative z-10 inline-flex size-11 items-center justify-center rounded-full text-[#151313]/70 focus-ring transition-colors hover:text-[#151313]"
            >
                <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
        </div>
    );
}
