import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// Public, indexable. The proxy pins this URL to English.
export async function generateMetadata(): Promise<Metadata> {
    if (!showsUnreleasedPages()) return {};
    return getForBusinessMetadata('en');
}

export default function Page() {
    if (!showsUnreleasedPages()) notFound();
    return <ForBusinessPage />;
}
