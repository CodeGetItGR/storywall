import type { ReactNode } from 'react';

import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { JourneyStopModel } from '@/lib/eventJourney';

/** The current stop, opened up: its title, an optional line, and one action. */
export function JourneyStopCard({ stop, aside }: { stop: JourneyStopModel; aside?: ReactNode }) {
    if (!stop.card) return null;
    return (
        <div className="flex flex-col gap-4 rounded-3xl bg-primary-light/40 p-5 lg:flex-row lg:items-center lg:gap-8 lg:p-7">
            {/* Icon */}
            <div className="hidden lg:block">
                <JourneyStopIcon stop={stop} />
            </div>

            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="text-lg font-bold text-ink">{stop.title}</h3>
                {stop.detail && <p className="text-sm text-ink-muted">{stop.detail}</p>}
                {stop.card.body && <p className="text-sm text-ink-muted">{stop.card.body}</p>}
                <AppLink
                    href={stop.card.action.href}
                    className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition-opacity hover:opacity-90 lg:self-start"
                >
                    {stop.card.action.label}
                </AppLink>
            </div>

            {/* Plan (desktop) */}
            {aside && <div className="hidden lg:block lg:w-64">{aside}</div>}
        </div>
    );
}
