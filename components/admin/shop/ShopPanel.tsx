'use client';

import { useTranslations } from 'next-intl';

import { ShopCategoriesTable } from '@/components/admin/shop/ShopCategoriesTable';
import { ShopCategoryDrawer } from '@/components/admin/shop/ShopCategoryDrawer';
import { ShopStoreDrawer } from '@/components/admin/shop/ShopStoreDrawer';
import { ShopStoresTable } from '@/components/admin/shop/ShopStoresTable';
import { useShopPanel } from '@/hooks/useShopPanel';

// Connected Shopify stores and the shop's own categories.
export function ShopPanel() {
    const t = useTranslations('AdminPage.shop');
    const panel = useShopPanel();

    return (
        <section className="space-y-8">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Stores */}
            <ShopStoresTable query={panel.stores} onAddAction={panel.addStore} onOpenAction={panel.editStore} />

            {/* Categories */}
            <ShopCategoriesTable
                query={panel.categories}
                categories={panel.sortedCategories}
                onAddAction={panel.addCategory}
                onOpenAction={panel.editCategory}
            />

            {/* Drawers */}
            {panel.openStore && (
                <ShopStoreDrawer
                    key={panel.openStore === 'new' ? 'new' : panel.openStore.id}
                    store={panel.openStore === 'new' ? null : panel.openStore}
                    onCloseAction={panel.closeStore}
                />
            )}
            {panel.openCategory && (
                <ShopCategoryDrawer
                    key={panel.openCategory === 'new' ? 'new' : panel.openCategory.id}
                    category={panel.openCategory === 'new' ? null : panel.openCategory}
                    stores={panel.storeList}
                    defaultSortOrder={panel.nextCategorySortOrder}
                    onCloseAction={panel.closeCategory}
                />
            )}
        </section>
    );
}
