import { notFound } from 'next/navigation';

import { ShopProductPage } from '@/components/shop/ShopProductPage';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Locale } from '@/i18n/config';
import { shopProductPath } from '@/lib/shop';
import { loadShopProduct } from '@/lib/shopServer';

// /shop/{store}/{handle} and /el/shop/{store}/{handle}.
export async function ShopProductScreen({ locale, storeSlug, handle }: { locale: Locale; storeSlug: string; handle: string }) {
    const product = await loadShopProduct(storeSlug, handle);
    if (!product) notFound();

    return (
        <ShopShell locale={locale} alternatePaths={{ en: shopProductPath('en', storeSlug, handle), el: shopProductPath('el', storeSlug, handle) }}>
            <ShopProductPage locale={locale} product={product} />
        </ShopShell>
    );
}
