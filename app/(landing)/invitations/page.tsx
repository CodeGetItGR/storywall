import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ThemeCataloguePage } from '@/components/saveMyDate/storefront/ThemeCataloguePage';
import type { CatalogueSearchParams } from '@/lib/invitation/themeCatalogue';
import { getThemeCatalogueMetadata } from '@/lib/invitation/themeCatalogueMetadata';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type PageProps = { searchParams: Promise<CatalogueSearchParams> };

// The English theme catalogue. The Greek one is /el/prosklitiria. Hidden on production until launch.
export async function generateMetadata(): Promise<Metadata> {
    return showsSaveMyDate() ? getThemeCatalogueMetadata('en') : {};
}

export default async function Page({ searchParams }: PageProps) {
    if (!showsSaveMyDate()) notFound();
    return <ThemeCataloguePage locale="en" searchParams={await searchParams} />;
}
