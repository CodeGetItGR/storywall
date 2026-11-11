'use client';

import { useLocale } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import { useThemeCatalogueColumns } from '@/hooks/useThemeCatalogueColumns';
import { useThemeCatalogueFilters } from '@/hooks/useThemeCatalogueFilters';
import { useThemeCatalogueListMemory } from '@/hooks/useThemeCatalogueListMemory';
import type { Locale } from '@/i18n/config';
import { CATALOGUE_PAGE_SIZE, type CatalogueFilters, type InvitationThemeCardDto, visibleThemes } from '@/lib/invitation/themeCatalogue';

export type ThemeCatalogueState =
    | { kind: 'loading' }
    | { kind: 'error' }
    | { kind: 'empty' }
    | { kind: 'themes'; themes: InvitationThemeCardDto[]; hasMore: boolean };

// Everything the catalogue shows: the themes the filters leave, how many of them are revealed so far,
// and the controls' values and actions.
export function useThemeCatalogue(path: string, initialFilters: CatalogueFilters) {
    const locale = useLocale() as Locale;
    const { themes, isPending, isError, retry } = useInvitationThemeCatalogue();
    const [visibleCount, setVisibleCount] = useState(CATALOGUE_PAGE_SIZE);
    const resetCount = useCallback(() => setVisibleCount(CATALOGUE_PAGE_SIZE), []);
    const { filters, setEventType, setQuery, setSort } = useThemeCatalogueFilters(path, initialFilters, resetCount);
    const { columns, setColumns } = useThemeCatalogueColumns();

    const matching = useMemo(() => (themes ? visibleThemes(themes, filters, locale) : []), [themes, filters, locale]);
    const hasMore = visibleCount < matching.length;
    const loadMore = useCallback(() => setVisibleCount((count) => count + CATALOGUE_PAGE_SIZE), []);
    const restoreCount = useCallback((count: number) => setVisibleCount(Math.max(CATALOGUE_PAGE_SIZE, count)), []);
    const sentinelRef = useInfiniteScrollSentinel(hasMore, loadMore, Math.min(visibleCount, matching.length));
    useThemeCatalogueListMemory(`theme-catalogue:${filters.eventType ?? ''}|${filters.sort}|${filters.query}`, themes !== null, visibleCount, restoreCount);

    const state: ThemeCatalogueState = useMemo(() => {
        if (themes) {
            return matching.length > 0 ? { kind: 'themes', themes: matching.slice(0, visibleCount), hasMore } : { kind: 'empty' };
        }
        if (isError) return { kind: 'error' };
        return isPending ? { kind: 'loading' } : { kind: 'error' };
    }, [themes, matching, visibleCount, hasMore, isError, isPending]);

    return { state, filters, setEventType, setQuery, setSort, columns, setColumns, loadMore, sentinelRef, retry };
}
