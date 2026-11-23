'use client';

import { Logo } from '@/components/common/Logo';
import { AppLink } from '@/components/ui/AppLink';
import { useFeedBackdropStrip } from '@/hooks/useFeedBackdropStrip';
import { routes } from '@/lib/routes';

import { Countdown } from './Countdown';

// On a Save my date theme the header draws the page's own picture, lined up with it, so it hides the posts
// scrolling under it without showing an edge.
export function Header({ countdownTime, eventId }: { countdownTime: number; eventId: string }) {
    const strip = useFeedBackdropStrip<HTMLDivElement>();
    return (
        <div ref={strip} className="feed-backdrop-strip sticky top-0 z-20 w-full bg-event">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <AppLink href={routes.landing} className="rounded-lg">
                    <Logo direction="row" wordmarkClassName="h-7 w-auto xxs:h-6 xs:h-8 sm:h-8" />
                </AppLink>
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>
        </div>
    );
}
