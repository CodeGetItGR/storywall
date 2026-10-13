import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

type PageProps = { params: Promise<{ slug: string }> };

// Only /el/epaggelmaties exists; /en/epaggelmaties and any other slug 404.
// The English page lives at /for-business. The segment is [slug] because it also
// serves English occasion pages (see ../page.tsx).
export function generateStaticParams() {
    return [{ slug: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (slug !== 'el' || !showsUnreleasedPages()) return {};
    return getForBusinessMetadata('el');
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    if (slug !== 'el' || !showsUnreleasedPages()) notFound();
    return <ForBusinessPage />;
}
