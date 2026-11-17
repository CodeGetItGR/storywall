'use client';

import { useCallback, useState } from 'react';

import { type CatalogueEventType, type CatalogueFilters, catalogueHref,type CatalogueSort } from '@/lib/invitation/themeCatalogue';
import { replacePageUrl } from '@/lib/overlayHistory';

// The catalogue's event type, search and order. They live in the URL too, so a shared or reloaded link
// shows the same list, but change it without a server render.
export function useThemeCatalogueFilters(path: string, initialFilters: CatalogueFilters, onChange: () => void) {
    const [filters, setFilters] = useState(initialFilters);

    const update = useCallback(
        (patch: Partial<CatalogueFilters>) => {
            const next = { ...filters, ...patch };
            setFilters(next);
            replacePageUrl(catalogueHref(path, next));
            onChange();
        },
        [filters, onChange, path],
    );

    const setEventType = useCallback((eventType: CatalogueEventType | null) => update({ eventType }), [update]);
    const setQuery = useCallback((query: string) => update({ query }), [update]);
    const setSort = useCallback((sort: CatalogueSort) => update({ sort }), [update]);

    return { filters, setEventType, setQuery, setSort };
}
