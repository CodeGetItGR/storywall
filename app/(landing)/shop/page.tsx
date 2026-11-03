import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopListScreen } from '@/components/shop/ShopListScreen';
import { parseShopPage } from '@/lib/shop';
import { getShopMetadata } from '@/lib/shopMetadata';
import { showsShop } from '@/lib/shopRelease';

type PageProps = { searchParams: Promise<{ category?: string | string[]; page?: string | string[] }> };

// Noindex; the proxy reads the language from the URL (publicPageLocale).
export async function generateMetadata(): Promise<Metadata> {
    if (!showsShop()) return {};
    return getShopMetadata('en');
}

export default async function Page({ searchParams }: PageProps) {
    if (!showsShop()) notFound();
    const { category, page } = await searchParams;
    return <ShopListScreen locale="en" category={typeof category === 'string' ? category : undefined} page={parseShopPage(page)} />;
}
