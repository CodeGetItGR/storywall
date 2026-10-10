import type { Metadata } from 'next';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';

// Public, indexable. The proxy pins this URL to English.
export function generateMetadata(): Promise<Metadata> {
    return getForBusinessMetadata('en');
}

export default function Page() {
    return <ForBusinessPage />;
}
