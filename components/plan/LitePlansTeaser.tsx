'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils';

type LitePlansTeaserProps = {
    // The teaser line, e.g. "Just photos or wishes? From 29€".
    label: string;
    open: boolean;
    onToggleAction: () => void;
    // The lite plan cards, shown under the line while open.
    children: ReactNode;
    className?: string;
};

// A quiet line that opens the lite plans under it. One block: callers place it with flex order.
export function LitePlansTeaser({ label, open, onToggleAction, children, className }: LitePlansTeaserProps) {
    const panelId = useId();

    return (
        <div className={cn('flex flex-col items-center', className)}>
            {/* Teaser line */}
            <button
                aria-controls={panelId}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 py-2 text-[15px] underline decoration-current/40 underline-offset-4 hover:decoration-current"
                onClick={onToggleAction}
                type="button"
            >
                {label}
                <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </button>

            {/* Lite plans */}
            <div className="mt-4 w-full" hidden={!open} id={panelId}>
                {open ? children : null}
            </div>
        </div>
    );
}
