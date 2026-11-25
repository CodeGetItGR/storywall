'use client';

import '@/components/event/feedBackdrop.css';

import { Logo } from '@/components/common/Logo';
import { AppLink } from '@/components/ui/AppLink';
import { useFeedBackdropStrip } from '@/hooks/useFeedBackdropStrip';
import { routes } from '@/lib/routes';

import { Countdown } from './Countdown';

// On a Save my date theme the header draws the page's own picture, lined up with it, so it hides the posts
// scrolling under it without showing an edge, and fades
// out just below itself. A cover picture fixed to the screen shows through its fill.
export function Header({ countdownTime, eventId }: { countdownTime: number; eventId: string }) {
    const strip = useFeedBackdropStrip<HTMLDivElement>();
    return (
        <div ref={strip} className="sticky top-0 z-20 w-full">
            {/* The page behind the header, fading out just below it */}
            <div aria-hidden="true" className="feed-backdrop-strip-fill bg-event" />
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <AppLink href={routes.landing} className="rounded-lg">
                    <Logo direction="row" wordmarkClassName="on-page-wordmark h-7 w-auto xxs:h-6 xs:h-8 sm:h-8" />
                </AppLink>
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>
        </div>
    );
}
