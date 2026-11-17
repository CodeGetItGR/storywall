import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ThemeCataloguePage } from '@/components/saveMyDate/storefront/ThemeCataloguePage';
import type { CatalogueSearchParams } from '@/lib/invitation/themeCatalogue';
import { getThemeCatalogueMetadata } from '@/lib/invitation/themeCatalogueMetadata';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<CatalogueSearchParams> };

// The Greek theme catalogue: only /el/prosklitiria exists. The English one is /invitations. The segment
// is [slug] because it also serves English occasion pages (see ../page.tsx). Hidden on production until launch.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return (await params).slug === 'el' && showsSaveMyDate() ? getThemeCatalogueMetadata('el') : {};
}

export default async function Page({ params, searchParams }: PageProps) {
    if ((await params).slug !== 'el' || !showsSaveMyDate()) notFound();
    return <ThemeCataloguePage locale="el" searchParams={await searchParams} />;
}
