'use client';

import { EventCelebration } from '@/components/celebration/EventCelebration';
import { useGiftClaimCelebration } from '@/hooks/useGiftClaimCelebration';
import type { GiftClaimResponseDto } from '@/lib/api/types';

// After a claim: the event card, "Gift claimed", whether it is theirs now or on a date, and where to go next.
export function GiftClaimCelebration({ outcome }: { outcome: GiftClaimResponseDto }) {
    const celebration = useGiftClaimCelebration(outcome);

    return (
        <main>
            {/* Celebration */}
            <EventCelebration
                card={celebration.card}
                heading={celebration.heading}
                line={celebration.line}
                feedHref={celebration.feedHref}
                inviteHref={celebration.inviteHref}
                belowHeader={false}
            />
        </main>
    );
}
