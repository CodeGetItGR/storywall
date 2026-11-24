'use client';

import type { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';
import { AppLink } from '@/components/ui/AppLink';
import { useFeedBackdropStrip } from '@/hooks/useFeedBackdropStrip';
import { routes } from '@/lib/routes';

import { Countdown } from './Countdown';

// On a Save my date theme the header draws the page's own picture, lined up with it, so it hides the posts
// scrolling under it without showing an edge. A cover picture fixed to the screen shows through its fill. pinned: the Invitation | Feed switch once it has scrolled under the
// header, drawn just below it (outside the strip, so the page's backdrop shows around it).
export function Header({ countdownTime, eventId, pinned }: { countdownTime: number; eventId: string; pinned?: ReactNode }) {
    const strip = useFeedBackdropStrip<HTMLDivElement>();
    return (
        <div ref={strip} data-feed-header className="feed-backdrop-strip sticky top-0 z-20 w-full bg-event">
            {/* Fixed picture, behind the header */}
            <div aria-hidden="true" className="feed-backdrop-strip-fill" />
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <AppLink href={routes.landing} className="rounded-lg">
                    <Logo direction="row" wordmarkClassName="h-7 w-auto xxs:h-6 xs:h-8 sm:h-8" />
                </AppLink>
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>

            {/* Pinned Invitation | Feed switch */}
            {pinned && (
                <div className="pointer-events-none absolute inset-x-0 top-full flex justify-center pt-2">
                    <div className="pointer-events-auto">{pinned}</div>
                </div>
            )}
        </div>
    );
}
