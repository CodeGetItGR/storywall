import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopListScreen } from '@/components/shop/ShopListScreen';
import { parseShopPage } from '@/lib/shop';
import { getShopMetadata } from '@/lib/shopMetadata';
import { showsShop } from '@/lib/shopRelease';

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ category?: string | string[]; page?: string | string[] }>;
};

// Only /el/shop; the English shop is /shop. The segment is [slug] because it also serves
// English occasion pages (see ../page.tsx).
export function generateStaticParams() {
    return [{ slug: 'el' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (slug !== 'el' || !showsShop()) return {};
    return getShopMetadata('el');
}

export default async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    if (slug !== 'el' || !showsShop()) notFound();
    const { category, page } = await searchParams;
    return <ShopListScreen locale="el" category={typeof category === 'string' ? category : undefined} page={parseShopPage(page)} />;
}
