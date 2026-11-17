import { Heart, Moon } from 'lucide-react';
import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';

import { JourneyConnector } from '@/components/manage/overview/JourneyConnector';
import { JourneyStop } from '@/components/manage/overview/JourneyStop';
import { JourneyStopCard } from '@/components/manage/overview/JourneyStopCard';
import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import type { JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

type JourneyEnd = 'day' | 'night' | 'heart';

function PathEnd({ end, label }: { end: JourneyEnd; label: string }) {
    if (end === 'day') return <Image src="/icons/balloon.svg" alt={label} width={40} height={56} className="h-14 w-10 object-contain" unoptimized />;
    const Icon = end === 'night' ? Moon : Heart;
    return <Icon className="h-9 w-9 fill-[#e48279] text-[#e48279]" aria-hidden="true" />;
}

// A connector is walked when the stop it leaves is done (it reaches the next stop, done or current).
const walked = (stops: JourneyStopModel[], index: number) => stops[index].status === 'done';

/**
 * The winding path. Small screens: stops down the page, alternating sides, the current card beside
 * its circle in place of the stop's text. Desktop: stops across in a wave, the current card under the
 * whole path.
 */
export function JourneyPath({
    label,
    stops,
    end,
    endLabel,
    replacementCard,
    aside,
}: {
    label: string;
    stops: JourneyStopModel[];
    end: JourneyEnd;
    endLabel: string;
    // Shown instead of the current stop's card (the All set card).
    replacementCard?: ReactNode;
    // Beside the card on desktop (the plan line).
    aside?: ReactNode;
}) {
    const current = stops.find((stop) => stop.status === 'current' && stop.card);
    // The stop whose card sits beside its circle on small screens; none when a replacement card shows.
    const opened = replacementCard ? undefined : current;
    const card = replacementCard ?? (current ? <JourneyStopCard stop={current} placement="under" aside={aside} /> : null);

    return (
        <>
            {/* Path (small screens) */}
            <div data-testid="journey-mobile" className="lg:hidden">
                <ol aria-label={label} className="flex flex-col">
                    {stops.map((stop, index) => (
                        <li key={stop.key} className="flex flex-col">
                            {stop === opened ? (
                                // Current stop: its circle, a straight stem, and the card beside them
                                <div className={cn('flex items-stretch gap-4', index % 2 === 1 && 'flex-row-reverse')}>
                                    <div className="flex shrink-0 flex-col items-center">
                                        <JourneyStopIcon stop={stop} />
                                        <JourneyConnector orientation="stem" walked={walked(stops, index)} className="mt-4 min-h-4 w-2 flex-1" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <JourneyStopCard stop={stop} placement="beside" />
                                    </div>
                                </div>
                            ) : (
                                <div className={cn('flex', index % 2 === 0 ? 'justify-start' : 'justify-end')}>
                                    <JourneyStop stop={stop} align={index % 2 === 0 ? 'start' : 'end'} />
                                </div>
                            )}
                            {/* Connector */}
                            <JourneyConnector orientation="vertical" reverse={index % 2 === 1} walked={walked(stops, index)} className="mx-7 h-16" />
                        </li>
                    ))}
                </ol>
                {/* End, or the replacement card the path runs into */}
                {replacementCard ?? (
                    <div className={cn('flex', stops.length % 2 === 0 ? 'justify-start pl-4' : 'justify-end pr-4')}>
                        <PathEnd end={end} label={endLabel} />
                    </div>
                )}
            </div>

            {/* Path (desktop) */}
            <div className="hidden lg:block">
                <ol aria-label={label} className="flex items-start">
                    {stops.map((stop, index) => (
                        <Fragment key={stop.key}>
                            <li className={cn('flex w-36 shrink-0 justify-center', index % 2 === 1 && 'mt-20')}>
                                <JourneyStop stop={stop} align="center" />
                            </li>
                            <li aria-hidden="true" className="min-w-8 flex-1 self-stretch pt-7">
                                <JourneyConnector
                                    orientation="horizontal"
                                    reverse={index % 2 === 1}
                                    walked={walked(stops, index)}
                                    className="h-20 w-full"
                                />
                            </li>
                        </Fragment>
                    ))}
                    {/* End */}
                    <li className={cn('flex shrink-0 items-center', stops.length % 2 === 1 && 'mt-20')}>
                        <PathEnd end={end} label={endLabel} />
                    </li>
                </ol>
                {/* Current card */}
                {card && <div className="mt-8">{card}</div>}
            </div>
        </>
    );
}
