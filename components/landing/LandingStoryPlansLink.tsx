'use client';

import type { MouseEvent } from 'react';

import { pickLandingEventType } from '@/hooks/useLandingPricingEventType';
import { useLandingPricingOffers } from '@/hooks/useLandingPricingOffers';
import { LANDING_PRICING_HASH } from '@/lib/landingHero';
import { landingClickAttributes } from '@/lib/landingTracking';

// A story row's link down to the plans, with the row's event type picked there first. Hidden while the
// plans don't offer that type.
export function LandingStoryPlansLink({ className, eventTypeSlug, label }: { className: string; eventTypeSlug: string; label: string }) {
    const offered = useLandingPricingOffers(eventTypeSlug);

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        pickLandingEventType(eventTypeSlug);
        // Held by useLandingDeferredRender, which jumps once the sections above the plans mount.
        if (event.nativeEvent.defaultPrevented) return;
        // Changing the URL mid-click cancels the link's own jump, and a hash already in the URL
        // wouldn't jump again, so the scroll is made here (smooth unless motion is reduced, per the CSS).
        event.preventDefault();
        document.getElementById(LANDING_PRICING_HASH.slice(1))?.scrollIntoView();
    }

    if (!offered) return null;

    return (
        <a
            className={className}
            href={LANDING_PRICING_HASH}
            onClick={handleClick}
            {...landingClickAttributes({ event: 'plans', placement: 'stories' })}
        >
            {label}
        </a>
    );
}
