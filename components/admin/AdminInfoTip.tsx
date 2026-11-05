'use client';

import { Info } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';

// An "i" button that shows a short description: on hover, keyboard focus or tap. `label` is the
// button's accessible name. The bubble sits in <body> with fixed placement, so a table's
// overflow-x-auto never clips it; it carries the admin scope itself, since <body> is outside the
// console's tokens, and stays above a drawer.
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
            {open &&
                createPortal(
                    <div
                        ref={bubbleRef}
                        id={id}
                        role="tooltip"
                        className="admin-shell pointer-events-none fixed top-0 left-0 z-70 w-64 max-w-[calc(100vw-16px)] rounded-lg bg-ink px-3 py-2 text-left font-sans text-xs leading-5 font-normal tracking-normal whitespace-normal text-white normal-case shadow-[0_12px_32px_-12px_rgba(18,20,28,0.5)]"
                    >
                        {text}
                    </div>,
                    document.body,
                )}
        </>
    );
}
