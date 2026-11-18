'use client';

import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

// A tip's dark bubble. It sits in <body> with fixed placement, so a table's overflow-x-auto never
// clips it; it carries the admin scope itself, since <body> is outside the console's tokens, and stays
// above a drawer. With an `id` it's the tooltip that describes its trigger, sized for a sentence.
// Without one it shows the word its trigger is already named by: it hugs the word, and screen readers
// skip it so they don't hear the word twice.
export function AdminTipBubble({ bubbleRef, text, id }: { bubbleRef: RefObject<HTMLDivElement | null>; text: string; id?: string }) {
    return createPortal(
        <div
            ref={bubbleRef}
            id={id}
            role={id ? 'tooltip' : undefined}
            aria-hidden={id ? undefined : true}
            className={cn(
                'admin-shell pointer-events-none fixed top-0 left-0 z-70 max-w-[calc(100vw-16px)] rounded-lg bg-ink px-3 py-2 text-left font-sans text-xs leading-5 font-normal tracking-normal whitespace-normal text-white normal-case shadow-[0_12px_32px_-12px_rgba(18,20,28,0.5)]',
                id ? 'w-64' : 'w-max',
            )}
        >
            {text}
        </div>,
        document.body,
    );
}
