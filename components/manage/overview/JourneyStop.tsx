import { JourneyStopExtras } from '@/components/manage/overview/JourneyStopExtras';
import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

/** One stop: its circle, title, line, chips and links. `align` puts the text on the circle's left or right. */
export function JourneyStop({ stop, align }: { stop: JourneyStopModel; align: 'start' | 'end' | 'center' }) {
    return (
        <div
            className={cn('flex items-center gap-3', align === 'end' && 'flex-row-reverse text-right', align === 'center' && 'flex-col text-center')}
        >
            {/* Circle */}
            <JourneyStopIcon stop={stop} />

            {/* Text */}
            <div className={cn('flex min-w-0 flex-col gap-1', align === 'end' && 'items-end', align === 'center' && 'items-center')}>
                <AppLink href={stop.href} className="text-[15px] leading-tight font-bold text-ink hover:underline">
                    {stop.title}
                </AppLink>
                {stop.highlight && <span className="text-sm font-semibold text-primary-dark">{stop.highlight}</span>}
                {stop.detail && <span className="text-sm text-ink-muted">{stop.detail}</span>}
                {/* Chips and links */}
                <JourneyStopExtras stop={stop} align={align} />
            </div>
        </div>
    );
}
