import { getTranslations } from 'next-intl/server';

import { ShopCategoryTabs } from '@/components/shop/ShopCategoryTabs';
import { ShopPagination } from '@/components/shop/ShopPagination';
import { ShopProductGrid } from '@/components/shop/ShopProductGrid';
import { SHOP_INNER, SHOP_MUTED } from '@/components/shop/shopStyles';
import type { Locale } from '@/i18n/config';
import type { ShopCategoryDto, ShopProductPageDto } from '@/lib/api/types';

export async function ShopPage({
    locale,
    categories,
    category,
    products,
}: {
    locale: Locale;
    categories: ShopCategoryDto[];
    category?: string;
    products: ShopProductPageDto;
}) {
    const t = await getTranslations({ locale, namespace: 'Shop' });

    return (
        <main className={`${SHOP_INNER} flex flex-col gap-6 pt-4 pb-16 min-[761px]:pb-24`}>
            {/* Header */}
            <h1 className="m-0 [font-family:var(--editorial)] text-[44px] leading-[0.95] font-normal tracking-[-0.04em] min-[761px]:text-[64px]">
                {t('title')}
            </h1>
            {/* Categories */}
            <ShopCategoryTabs locale={locale} categories={categories} active={category} />
            {/* Products */}
            {products.items.length === 0 ? (
                <p className={`m-0 py-16 text-center ${SHOP_MUTED}`}>{t('empty')}</p>
            ) : (
                <ShopProductGrid locale={locale} products={products.items} />
            )}
            {/* Pagination */}
            <ShopPagination locale={locale} category={category} page={products.page} totalPages={products.totalPages} />
        </main>
    );
}
