'use client';

import { FeedScheduleRsvp } from '@/components/feed/sections/FeedScheduleRsvp';
import type { FeedScheduleItem } from '@/hooks/useFeedSchedule';
import type { FeedScheduleRsvpLink } from '@/hooks/useFeedScheduleRsvp';

// A session's name in the timeline, with the gradient Now on the one under way.
export function FeedScheduleName({ item, titleId, nowLabel }: { item: FeedScheduleItem; titleId: string; nowLabel: string }) {
    return (
        <>
            <span id={titleId} className="wrap-break-word">
                {item.title}
            </span>
            {item.state === 'now' && (
                <span className="ms-1.5 inline-block rounded-full bg-(image:--logo) px-2 py-0.5 align-middle font-sans text-[11px] font-semibold text-white">
                    {nowLabel}
                </span>
            )}
        </>
    );
}

type FeedScheduleMoreProps = { item: FeedScheduleItem; titleId: string; rsvp: FeedScheduleRsvpLink | null; rsvpName: string };

// Under a session's name: its place, and its RSVP button when it takes replies.
export function FeedScheduleMore({ item, titleId, rsvp, rsvpName }: FeedScheduleMoreProps) {
    if (!item.place && !rsvp) return null;

    return (
        <>
            {/* Place */}
            {item.place && <span className="mt-0.5 block text-xs wrap-break-word opacity-70">{item.place}</span>}

            {/* RSVP */}
            {rsvp && <FeedScheduleRsvp {...rsvp} label={rsvpName} describedBy={titleId} className="mt-2" />}
        </>
    );
}
