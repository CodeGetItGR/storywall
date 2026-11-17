import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ThemeDetailPage } from '@/components/saveMyDate/storefront/ThemeDetailPage';
import { themePageMetadata } from '@/lib/invitation/serverThemePageMetadata';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type PageProps = { params: Promise<{ themeSlug: string }> };

// One theme's English page. The Greek one is /el/prosklitiria/<slug>. Hidden on production until launch.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return showsSaveMyDate() ? themePageMetadata((await params).themeSlug, 'en') : {};
}

export default async function Page({ params }: PageProps) {
    if (!showsSaveMyDate()) notFound();
    return <ThemeDetailPage locale="en" slug={(await params).themeSlug} />;
}
