import { notFound } from 'next/navigation';

import { ShopPage } from '@/components/shop/ShopPage';
import { ShopShell } from '@/components/shop/ShopShell';
import type { Locale } from '@/i18n/config';
import { shopListPath } from '@/lib/shop';
import { loadShopList } from '@/lib/shopServer';

// /shop and /el/shop.
export async function ShopListScreen({ locale, category, page }: { locale: Locale; category?: string; page: number }) {
    const data = await loadShopList(category, page);
    if (!data) notFound();

    return (
        <ShopShell locale={locale} alternatePaths={{ en: shopListPath('en', { category, page }), el: shopListPath('el', { category, page }) }}>
            <ShopPage locale={locale} categories={data.categories} category={category} products={data.products} />
        </ShopShell>
    );
}
