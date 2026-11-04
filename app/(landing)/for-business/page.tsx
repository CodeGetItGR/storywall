import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';
import { showsForBusinessHub } from '@/lib/forBusinessRelease';

// Public, indexable. The proxy pins this URL to English.
export async function generateMetadata(): Promise<Metadata> {
    if (!showsForBusinessHub()) return {};
    return getForBusinessMetadata('en');
}

export default function Page() {
    if (!showsForBusinessHub()) notFound();
    return <ForBusinessPage />;
}
