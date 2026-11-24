import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// The app's small drawn icon: a coloured wash with the sign on a tilted paper card, as in the feed's quick actions.
// Decoration only: the label next to it names the thing.
export function WashCardIcon({ icon: Icon, wash, ink, className }: { icon: LucideIcon; wash: string; ink: string; className?: string }) {
    return (
        <span aria-hidden="true" className={cn('flex size-12 shrink-0 items-center justify-center rounded-[0.875rem]', wash, className)}>
            <span className="flex size-8 -rotate-6 items-center justify-center rounded-md bg-card shadow-sm ring-1 ring-ink/5">
                <Icon className={cn('size-4.5', ink)} strokeWidth={2.25} />
            </span>
        </span>
    );
}
