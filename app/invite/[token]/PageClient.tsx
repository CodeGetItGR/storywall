'use client';

import { use } from 'react';

import InviteOnboardingBoundary from './InviteOnboardingBoundary';

export default function InviteOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    return <InviteOnboardingBoundary token={token} />;
}
