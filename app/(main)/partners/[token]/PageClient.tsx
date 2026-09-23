'use client';

import { use } from 'react';

import { PartnerPortalBoundary } from '@/components/partners/PartnerPortalBoundary';

export default function PartnerPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    return <PartnerPortalBoundary token={token} />;
}
