import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ForBusinessPage } from '@/components/forBusiness/ForBusinessPage';
import { getForBusinessMetadata } from '@/lib/forBusinessMetadata';

type PageProps = { params: Promise<{ locale: string }> };

// Only /el/epaggelmaties exists; /en/epaggelmaties and any other locale 404.
// The English page lives at /for-business.
export function generateStaticParams() {
    return [{ locale: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    if (locale !== 'el') return {};
    return getForBusinessMetadata('el');
}

export default async function Page({ params }: PageProps) {
    const { locale } = await params;
    if (locale !== 'el') notFound();
    return <ForBusinessPage />;
}
