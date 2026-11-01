import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// A one-line message with one action, inside the page's own layout: the partner prompt, a section that could not
// load, or why the page has nothing to show. No heading of its own, so the page keeps a single h1.
export function BusinessNotice({ message, action, className }: { message: string; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3', className)}>
            {/* Message */}
            <p className="text-sm text-ink-muted">{message}</p>

            {/* Action */}
            {action}
        </div>
    );
}
