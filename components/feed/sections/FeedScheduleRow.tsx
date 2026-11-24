'use client';

import { useId } from 'react';

import { FeedScheduleRsvp } from '@/components/feed/sections/FeedScheduleRsvp';
import type { FeedScheduleItem } from '@/hooks/useFeedSchedule';
import type { FeedScheduleRsvpLink } from '@/hooks/useFeedScheduleRsvp';
import { cn } from '@/lib/utils';

// The dotted rail runs from each row's dot to the next one's.
const RAIL =
    'not-last:before:absolute not-last:before:top-5 not-last:before:-bottom-5 not-last:before:left-[3.75rem] not-last:before:-translate-x-px not-last:before:border-l-2 not-last:before:border-dotted not-last:before:border-ink/20';

// One session on the rail.
type ScheduleRowProps = { item: FeedScheduleItem; nowLabel: string; rsvp: FeedScheduleRsvpLink | null; rsvpName: string };

export function FeedScheduleRow({ item, nowLabel, rsvp, rsvpName }: ScheduleRowProps) {
    const titleId = useId();
    const isNow = item.state === 'now';
    // Greyed on its own parts, so the rail keeps one colour down the list.
    const past = item.state === 'done' && 'opacity-50';

    return (
        <li data-state={item.state} className={cn('relative grid grid-cols-[3rem_1.5rem_1fr_auto] items-start', RAIL)}>
            {/* Time */}
            <span className={cn('pt-px text-sm text-ink-muted tabular-nums', past)}>{item.time}</span>

            {/* Rail */}
            <span
                aria-hidden="true"
                className={cn('mt-1.5 size-2.5 justify-self-center rounded-full', isNow ? 'bg-(image:--logo)' : 'bg-ink/30', past)}
            />

            {/* Session */}
            <span className={cn('flex min-w-0 flex-col', past)}>
                <span className="flex items-start gap-2 text-sm font-medium text-ink">
                    <span id={titleId} className="min-w-0 wrap-break-word">
                        {item.title}
                    </span>
                    {isNow && (
                        <span className="shrink-0 rounded-full bg-(image:--logo) px-2 py-0.5 text-[11px] font-semibold text-white">{nowLabel}</span>
                    )}
                </span>
                {item.place && <span className="text-xs wrap-break-word text-ink-muted">{item.place}</span>}
            </span>

            {/* RSVP */}
            {rsvp && <FeedScheduleRsvp {...rsvp} label={rsvpName} describedBy={titleId} />}
        </li>
    );
}
