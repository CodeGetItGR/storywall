import { getTranslations } from 'next-intl/server';

import { SHOP_CHIP, SHOP_CHIP_IDLE, SHOP_MUTED } from '@/components/shop/shopStyles';
import { AppLink } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import { shopListPath } from '@/lib/shop';
import { cn } from '@/lib/utils';

export async function ShopPagination({ locale, category, page, totalPages }: { locale: Locale; category?: string; page: number; totalPages: number }) {
    if (totalPages <= 1) return null;
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const linkClass = cn(SHOP_CHIP, SHOP_CHIP_IDLE, 'px-5');

    return (
        <nav aria-label={t('pagesLabel')} className="flex items-center justify-between gap-4 pt-4">
            {page > 0 ? (
                <AppLink href={shopListPath(locale, { category, page: page - 1 })} className={linkClass}>
                    {t('previous')}
                </AppLink>
            ) : (
                <span />
            )}
            <p className={`m-0 text-sm ${SHOP_MUTED}`}>{t('pageOf', { page: page + 1, total: totalPages })}</p>
            {page + 1 < totalPages ? (
                <AppLink href={shopListPath(locale, { category, page: page + 1 })} className={linkClass}>
                    {t('next')}
                </AppLink>
            ) : (
                <span />
            )}
        </nav>
    );
}
