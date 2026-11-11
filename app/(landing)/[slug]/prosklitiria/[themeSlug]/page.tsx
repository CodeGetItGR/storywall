import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ThemeDetailPage } from '@/components/saveMyDate/storefront/ThemeDetailPage';
import { themePageMetadata } from '@/lib/invitation/serverThemePageMetadata';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type PageProps = { params: Promise<{ slug: string; themeSlug: string }> };

// One theme's Greek page: only under /el/prosklitiria. The English one is /invitations/<slug>. Hidden on
// production until launch.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, themeSlug } = await params;
    return slug === 'el' && showsSaveMyDate() ? themePageMetadata(themeSlug, 'el') : {};
}

export default async function Page({ params }: PageProps) {
    const { slug, themeSlug } = await params;
    if (slug !== 'el' || !showsSaveMyDate()) notFound();
    return <ThemeDetailPage locale="el" slug={themeSlug} />;
}
