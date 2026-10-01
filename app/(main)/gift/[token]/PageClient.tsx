'use client';

import { use } from 'react';

import { GiftClaimScreen } from '@/components/giftMode/GiftClaimScreen';

export default function GiftClaimPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    return <GiftClaimScreen token={token} />;
}
