'use client';

import { GiftSection } from '@/components/giftMode/GiftSection';
import type { GiftHandoverResponseDto } from '@/lib/api/types';

export default function GiftTab({
    eventId,
    gift,
    canManage,
    eventActive,
}: {
    eventId: string;
    gift: GiftHandoverResponseDto | null;
    canManage: boolean;
    eventActive: boolean;
}) {
    return <GiftSection eventId={eventId} gift={gift} canManage={canManage} eventActive={eventActive} />;
}
