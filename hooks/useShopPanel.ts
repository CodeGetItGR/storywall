'use client';

import { useMemo, useState } from 'react';

import { useAdminShopCategories } from '@/hooks/useAdminShopCategories';
import { useAdminShopStores } from '@/hooks/useAdminShopStores';
import type { AdminShopCategoryDto, AdminShopStoreDto } from '@/lib/api/types';
import { bySortOrder, nextSortOrder } from '@/lib/sortOrder';

// 'new' opens an empty drawer; a record opens it for editing; null closes it.
type Open<T> = T | 'new' | null;

const NO_STORES: AdminShopStoreDto[] = [];

// The admin Shop panel: both lists and which drawer is open.
export function useShopPanel() {
    const stores = useAdminShopStores();
    const categories = useAdminShopCategories();
    const [store, setStore] = useState<Open<AdminShopStoreDto>>(null);
    const [category, setCategory] = useState<Open<AdminShopCategoryDto>>(null);

    const sortedCategories = useMemo(() => [...(categories.data ?? [])].sort(bySortOrder), [categories.data]);

    return {
        stores,
        categories,
        storeList: stores.data ?? NO_STORES,
        sortedCategories,
        nextCategorySortOrder: nextSortOrder(sortedCategories),
        openStore: store,
        openCategory: category,
        addStore: () => setStore('new'),
        editStore: setStore,
        closeStore: () => setStore(null),
        addCategory: () => setCategory('new'),
        editCategory: setCategory,
        closeCategory: () => setCategory(null),
    };
}
