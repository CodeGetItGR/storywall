import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The white card a module's feed block sits on, on every theme (KAN-299). underTools: in edit mode, with room for the
// block's tools at the top. Like the other cards on a dark page, it keeps the app's own ink (it isn't `on-page`).
export function FeedModuleCard({ underTools = false, children }: { underTools?: boolean; children: ReactNode }) {
    return (
        <div
            className={cn(
                'mx-4 my-3 flex flex-col items-center gap-4 rounded-2xl bg-white px-4 py-6 text-center font-sans text-ink shadow-[0_6px_18px_rgba(0,0,0,0.06)]',
                underTools && 'pt-18',
            )}
        >
            {children}
        </div>
    );
}

// The module's name, large, in the serif of the looks the owner picked (G2, C1).
export function FeedModuleTitle({ id, children }: { id?: string; children: ReactNode }) {
    return (
        <h2 id={id} className="font-editorial text-[28px] leading-tight text-ink">
            {children}
        </h2>
    );
}

// The block's main action: a gradient pill, as the app's other upload and write buttons.
export const FEED_MODULE_BUTTON =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none';
