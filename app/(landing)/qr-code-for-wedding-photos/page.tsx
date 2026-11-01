import type { Metadata } from 'next';

import { QrWeddingPage } from '@/components/qrWedding/QrWeddingPage';
import { getQrWeddingMetadata } from '@/lib/qrWeddingMetadata';

// Public, indexable. The proxy pins this URL to English.
export function generateMetadata(): Promise<Metadata> {
    return getQrWeddingMetadata('en');
}

export default function Page() {
    return <QrWeddingPage locale="en" />;
}
