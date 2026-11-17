'use client';

import { Info } from 'lucide-react';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';

// An "i" button that shows a short description: on hover, keyboard focus or tap. `label` is the
// button's accessible name.
export function AdminInfoTip({ label, text }: { label: string; text: string }) {
    const { id, open, triggerRef, bubbleRef, handlers } = useAdminInfoTip();

    return (
        <>
            {/* Icon */}
            <button
                ref={triggerRef}
                type="button"
                aria-label={label}
                aria-describedby={open ? id : undefined}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
                onClick={handlers.handleClick}
                className="-m-2 inline-flex shrink-0 cursor-help items-center justify-center rounded-full p-2 align-middle text-ink-faint normal-case transition-colors hover:text-ink-muted focus-visible:text-ink-muted focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:outline-none"
            >
                <Info aria-hidden="true" className="h-3.5 w-3.5" />
            </button>

            {/* Bubble */}
            {open && <AdminTipBubble bubbleRef={bubbleRef} id={id} text={text} />}
        </>
    );
}
