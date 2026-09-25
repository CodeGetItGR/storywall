'use client';

import { ScheduleSessionCard } from '@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionCard';
import type { EventSessionResponseDto } from '@/lib/api/types';

interface ScheduleTimelineItemProps {
    session: EventSessionResponseDto;
    time: string;
    isLast: boolean;
}

export function ScheduleTimelineItem({ session, time, isLast }: ScheduleTimelineItemProps) {
    return (
        <li className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
            {/* Rail */}
            <div className="relative flex justify-center" aria-hidden="true">
                <span className="relative z-10 mt-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                {!isLast && <span className="absolute top-4 -bottom-1.5 w-0.5 rounded-full bg-primary/20" />}
            </div>

            {/* Session */}
            <div className={isLast ? undefined : 'pb-6'}>
                <p className="text-sm font-semibold text-ink tabular-nums">{time}</p>
                <ScheduleSessionCard session={session} className="mt-2" />
            </div>
        </li>
    );
}
