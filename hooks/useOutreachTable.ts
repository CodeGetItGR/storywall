'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useOutreachProspects } from '@/hooks/useAdminOutreach';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { OUTREACH_PAGE_SIZE, type OutreachSort, type OutreachSortField, outreachSortParam, toggleOutreachSort } from '@/lib/adminOutreach';
import type { OutreachPriority, OutreachProspectQuery, OutreachStatus, OutreachType } from '@/lib/api/types';

const SEARCH_DELAY_MS = 300;

export type OutreachFilters = {
    search: string;
    type: OutreachType | null;
    city: string | null;
    status: OutreachStatus | null;
    priority: OutreachPriority | null;
    dueOnly: boolean;
};

const NO_FILTERS: OutreachFilters = { search: '', type: null, city: null, status: null, priority: null, dueOnly: false };

// The selects hold '' for "All".
function orNull<T extends string>(value: string): T | null {
    return value ? (value as T) : null;
}

// Filters, sort and page of the prospects table. Every filter change goes back to the first page.
export function useOutreachTable() {
    const [filters, setFilters] = useState<OutreachFilters>(NO_FILTERS);
    const [sort, setSort] = useState<OutreachSort>(null);
    const [page, setPage] = useState(0);
    const q = useDebouncedValue(filters.search.trim(), SEARCH_DELAY_MS);

    const query = useMemo<OutreachProspectQuery>(
        () => ({
            q: q || null,
            type: filters.type,
            city: filters.city,
            status: filters.status,
            priority: filters.priority,
            due: filters.dueOnly,
            sort: outreachSortParam(sort),
            page,
            size: OUTREACH_PAGE_SIZE,
        }),
        [filters.city, filters.dueOnly, filters.priority, filters.status, filters.type, page, q, sort],
    );
    const prospects = useOutreachProspects(query);

    const update = useCallback((patch: Partial<OutreachFilters>) => {
        setFilters((current) => ({ ...current, ...patch }));
        setPage(0);
    }, []);

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => update({ search: event.target.value }), [update]);
    const handleTypeChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => update({ type: orNull<OutreachType>(event.target.value) }),
        [update],
    );
    const handleCityChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => update({ city: orNull(event.target.value) }), [update]);
    const handleStatusChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => update({ status: orNull<OutreachStatus>(event.target.value) }),
        [update],
    );
    const handlePriorityChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => update({ priority: orNull<OutreachPriority>(event.target.value) }),
        [update],
    );
    const handleDueOnlyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => update({ dueOnly: event.target.checked }), [update]);
    const showDueOnly = useCallback(() => update({ ...NO_FILTERS, dueOnly: true }), [update]);
    const clearFilters = useCallback(() => update(NO_FILTERS), [update]);

    const handleSortClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const field = event.currentTarget.dataset.sortField as OutreachSortField | undefined;
        if (!field) return;
        setSort((current) => toggleOutreachSort(current, field));
        setPage(0);
    }, []);

    const hasFilters =
        Boolean(filters.search.trim()) ||
        filters.type !== null ||
        filters.city !== null ||
        filters.status !== null ||
        filters.priority !== null ||
        filters.dueOnly;

    return {
        filters,
        hasFilters,
        sort,
        page,
        setPage,
        rows: prospects.data?.content ?? [],
        pageInfo: prospects.data?.page ?? null,
        isLoading: prospects.isLoading,
        error: prospects.error,
        handleSearchChange,
        handleTypeChange,
        handleCityChange,
        handleStatusChange,
        handlePriorityChange,
        handleDueOnlyChange,
        handleSortClick,
        showDueOnly,
        clearFilters,
    };
}

export type OutreachTableState = ReturnType<typeof useOutreachTable>;
