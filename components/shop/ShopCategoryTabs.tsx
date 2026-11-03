import { getTranslations } from 'next-intl/server';

import { SHOP_CHIP, SHOP_CHIP_ACTIVE, SHOP_CHIP_IDLE, SHOP_SCROLL_ROW } from '@/components/shop/shopStyles';
import { AppLink } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import type { ShopCategoryDto } from '@/lib/api/types';
import { shopListPath } from '@/lib/shop';
import { cn } from '@/lib/utils';

// Horizontal scroll on phones instead of wrapping into several rows.
export async function ShopCategoryTabs({ locale, categories, active }: { locale: Locale; categories: ShopCategoryDto[]; active?: string }) {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    const tabs = [{ slug: undefined, label: t('all') }, ...categories.map((c) => ({ slug: c.slug, label: c.name[locale] }))];

    return (
        <nav aria-label={t('categoriesLabel')} className={`${SHOP_SCROLL_ROW} -mx-5 px-5 min-[761px]:mx-0 min-[761px]:px-0`}>
            <ul className="m-0 flex list-none gap-2 p-0 whitespace-nowrap">
                {tabs.map((tab) => (
                    <li key={tab.slug ?? 'all'}>
                        <AppLink
                            href={shopListPath(locale, { category: tab.slug })}
                            aria-current={tab.slug === active ? 'page' : undefined}
                            className={cn(SHOP_CHIP, tab.slug === active ? SHOP_CHIP_ACTIVE : SHOP_CHIP_IDLE)}
                        >
                            {tab.label}
                        </AppLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
