import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShopProductScreen } from '@/components/shop/ShopProductScreen';
import { getShopProductMetadata } from '@/lib/shopMetadata';
import { showsShop } from '@/lib/shopRelease';
import { decodeShopParam, loadShopProduct } from '@/lib/shopServer';

type PageProps = { params: Promise<{ store: string; handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    if (!showsShop()) return {};
    const { store, handle } = await params;
    const product = await loadShopProduct(decodeShopParam(store), decodeShopParam(handle));
    return product ? getShopProductMetadata('en', product.title) : {};
}

export default async function Page({ params }: PageProps) {
    if (!showsShop()) notFound();
    const { store, handle } = await params;
    return <ShopProductScreen locale="en" storeSlug={decodeShopParam(store)} handle={decodeShopParam(handle)} />;
}
