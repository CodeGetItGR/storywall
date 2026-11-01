import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { QrWeddingPage } from '@/components/qrWedding/QrWeddingPage';
import { getQrWeddingMetadata } from '@/lib/qrWeddingMetadata';

type PageProps = { params: Promise<{ slug: string }> };

// Only /el/qr-code-gamou exists; /en/qr-code-gamou and any other slug 404.
// The English page lives at /qr-code-for-wedding-photos. The segment is [slug] because it also
// serves English occasion pages (see ../page.tsx).
export function generateStaticParams() {
    return [{ slug: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    return slug === 'el' ? getQrWeddingMetadata('el') : {};
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    if (slug !== 'el') notFound();
    return <QrWeddingPage locale="el" />;
}
