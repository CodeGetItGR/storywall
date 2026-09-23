'use client';

import { use } from 'react';

import QrCodeLandingBoundary from './QrCodeLandingBoundary';

export default function QrCodeLandingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    return <QrCodeLandingBoundary token={token} />;
}
