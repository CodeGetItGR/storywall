'use client';

import type { ReactNode } from 'react';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';
import { cn } from '@/lib/utils';

// An icon that stands for a word (a change, a platform, a link type). The word is its accessible name
// and shows in a bubble on hover, keyboard focus or tap; a tap never reaches the row around it.
// `children` is the icon, hidden from screen readers. Inside another control (a toggle, a chip, a row
// button) draw the icon plain and give that control the tip instead: a button can't hold a button.
export function AdminIconTip({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    const { open, triggerRef, bubbleRef, handlers } = useAdminInfoTip();

    return (
        <>
            {/* Icon */}
            <button
                ref={triggerRef}
                type="button"
                aria-label={label}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
                onClick={handlers.handleClick}
                className={cn(
                    'inline-flex shrink-0 cursor-default items-center rounded focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:outline-none',
                    className,
                )}
            >
                {children}
            </button>

            {/* Bubble */}
            {open && <AdminTipBubble bubbleRef={bubbleRef} text={label} />}
        </>
    );
}
