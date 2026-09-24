import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Mobile-only "show features" link that shows and hides a plan card's feature
// list. It sits above the card's stretched select button, so tapping it doesn't
// pick the plan.
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
                onClick={onToggleAction}
                className="relative z-10 inline-flex min-h-11 items-center gap-1 rounded-sm text-[13px] font-medium text-[#151313]/65 focus-ring transition-colors hover:text-[#151313]"
            >
                {open ? collapseLabel : expandLabel}
                <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
        </div>
    );
}
