'use client';

import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

export type PlanEditorAnchor = { id: string; label: string; tone?: 'default' | 'danger' };

export function PlanEditorAnchors({ anchors, active }: { anchors: PlanEditorAnchor[]; active: string }) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.anchorId;
        if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return (
        // A horizontal strip on phones; a side column next to the form from md up.
        <nav className="sticky top-0 z-10 -mx-5 flex gap-1 overflow-x-auto border-b border-border bg-card px-5 py-2 md:mx-0 md:flex-col md:self-start md:overflow-visible md:border-b-0 md:px-0 md:py-0">
            {anchors.map((anchor) => (
                <button
                    key={anchor.id}
                    type="button"
                    data-anchor-id={anchor.id}
                    onClick={handleClick}
                    aria-current={active === anchor.id ? 'location' : undefined}
                    className={cn(
                        'shrink-0 rounded-md px-2.5 py-1 text-[12px] font-bold transition-colors md:py-1.5 md:text-left md:text-[13px]',
                        active === anchor.id ? 'bg-primary-light text-primary-dark' : 'text-ink-faint hover:text-ink',
                        anchor.tone === 'danger' && active !== anchor.id && 'text-status-danger/70',
                    )}
                >
                    {anchor.label}
                </button>
            ))}
        </nav>
    );
}
