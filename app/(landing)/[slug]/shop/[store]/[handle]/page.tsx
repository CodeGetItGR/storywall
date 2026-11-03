import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopProductScreen } from '@/components/shop/ShopProductScreen';
import { getShopProductMetadata } from '@/lib/shopMetadata';
import { showsShop } from '@/lib/shopRelease';
import { decodeShopParam, loadShopProduct } from '@/lib/shopServer';

type PageProps = { params: Promise<{ slug: string; store: string; handle: string }> };

// Only under /el; the English product pages are /shop/{store}/{handle}.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, store, handle } = await params;
    if (slug !== 'el' || !showsShop()) return {};
    const product = await loadShopProduct(decodeShopParam(store), decodeShopParam(handle));
    return product ? getShopProductMetadata('el', product.title) : {};
}

export default async function Page({ params }: PageProps) {
    const { slug, store, handle } = await params;
    if (slug !== 'el' || !showsShop()) notFound();
    return <ShopProductScreen locale="el" storeSlug={decodeShopParam(store)} handle={decodeShopParam(handle)} />;
}
