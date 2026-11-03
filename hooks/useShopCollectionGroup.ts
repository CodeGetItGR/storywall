'use client';

import { type ChangeEvent, useState } from 'react';

import { useShopStoreCollections } from '@/hooks/useAdminShopStores';
import type { AdminShopCategoryMappingDto } from '@/lib/api/types';

export type ShopCollectionOption = { gid: string; title: string; handle: string | null };

// One store's group in the category drawer's collection picker. Collections come live from
// Shopify, so they load only once the group is opened. A mapped collection Shopify no longer
// lists stays in the list, so the admin can still uncheck it.
export function useShopCollectionGroup(storeId: string, selected: AdminShopCategoryMappingDto[]) {
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState('');
    const query = useShopStoreCollections(expanded ? storeId : null);

    const live: ShopCollectionOption[] = (query.data ?? []).map((item) => ({ gid: item.gid, title: item.title, handle: item.handle }));
    const liveGids = new Set(live.map((item) => item.gid));
    const missing: ShopCollectionOption[] = selected
        .filter((item) => !liveGids.has(item.collectionGid))
        .map((item) => ({ gid: item.collectionGid, title: item.collectionTitle, handle: null }));
    const needle = search.trim().toLowerCase();
    const options = [...missing, ...live].filter(
        (item) => needle === '' || item.title.toLowerCase().includes(needle) || (item.handle ?? '').toLowerCase().includes(needle),
    );

    function optionFor(gid: string): ShopCollectionOption | undefined {
        return options.find((item) => item.gid === gid);
    }

    function toggleExpanded() {
        setExpanded((current) => !current);
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setSearch(event.currentTarget.value);
    }

    return {
        expanded,
        toggleExpanded,
        search,
        handleSearchChange,
        options,
        optionFor,
        isLoading: expanded && query.isLoading,
        error: query.error,
        isEmpty: expanded && !query.isLoading && !query.error && options.length === 0,
    };
}
