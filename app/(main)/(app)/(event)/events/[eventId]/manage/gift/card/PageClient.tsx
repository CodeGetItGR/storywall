'use client';

import { GiftCardPrintScreen } from '@/components/giftMode/GiftCardPrintScreen';
import { InvitationsQrPageSkeleton } from '@/components/manage/ManageSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GiftCardPage() {
    return (
        <EventRouteGate requireHost fallback={<InvitationsQrPageSkeleton />}>
            <GiftCardPrintScreen />
        </EventRouteGate>
    );
}
