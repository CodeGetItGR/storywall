import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import type { JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

/**
 * The current stop, opened up. `beside`: next to its circle on small screens, standing in for the
 * stop's own text (linked title and line). `under`: below the desktop path, where the stop keeps its
 * label, so only the title, body, action and aside show.
 */
export function JourneyStopCard({ stop, placement, aside }: { stop: JourneyStopModel; placement: 'beside' | 'under'; aside?: ReactNode }) {
    if (!stop.card) return null;
    const beside = placement === 'beside';
    return (
        <div className={cn('flex rounded-3xl bg-primary-light/40', beside ? 'flex-col p-5' : 'flex-row items-center gap-8 p-7')}>
            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="text-lg leading-tight font-bold text-ink">
                    {beside ? (
                        <AppLink href={stop.href} className="hover:underline">
                            {stop.title}
                        </AppLink>
                    ) : (
                        stop.title
                    )}
                </h3>
                {beside && stop.detail && <p className="text-sm text-ink-muted">{stop.detail}</p>}
                {stop.card.body && <p className="text-sm text-ink-muted">{stop.card.body}</p>}
                <AppLink
                    href={stop.card.action.href}
                    className={cn(
                        'mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition-opacity hover:opacity-90',
                        !beside && 'self-start',
                    )}
                >
                    {stop.card.action.label}
                </AppLink>
            </div>

            {/* Plan (desktop) */}
            {!beside && aside && <div className="w-64 shrink-0">{aside}</div>}
        </div>
    );
}
