'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { useAdminOrders } from '@/hooks/useAdminOrders';
import {
    type AdminOrderFilters,
    EMPTY_ORDER_FILTERS,
    filterValueFromInput,
    hasOrderFilters,
    isOrderRangeInvalid,
    ORDERS_HASH_ROOT,
    ORDERS_PAGE_SIZE,
    parseOrdersHash,
} from '@/lib/adminOrders';
import { pushPageEntry } from '@/lib/overlayHistory';

function currentOrderId(): string | null {
    return typeof window === 'undefined' ? null : parseOrdersHash(window.location.hash);
}

// The list's filters and page, and which order the hash has open. The list keeps its
// state while an order is open, so Back returns to the same page of the same results.
export function useOrdersPanel() {
    const { focus } = useAdminNavigation();
    // Arriving from an account's drawer narrows the list to that buyer.
    const [filters, setFilters] = useState<AdminOrderFilters>(() => ({ ...EMPTY_ORDER_FILTERS, buyerId: focus?.buyerId ?? null }));
    const [buyerLabel, setBuyerLabel] = useState<string | null>(focus?.buyerLabel ?? null);
    const [search, setSearchState] = useState('');
    const [page, setPage] = useState(0);
    const [moreOpen, setMoreOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(currentOrderId);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rangeInvalid = isOrderRangeInvalid(filters);
    const ordersQuery = useAdminOrders({ filters, page, size: ORDERS_PAGE_SIZE, enabled: !rangeInvalid });

    useEffect(() => {
        function syncFromHash() {
            setSelectedId(currentOrderId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    useEffect(() => {
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, []);

    // Every select and date input is named after the filter it sets.
    const handleFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setFilters((current) => ({ ...current, [name]: filterValueFromInput(name as keyof AdminOrderFilters, value) }));
        setPage(0);
    }, []);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.currentTarget;
        setSearchState(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setFilters((current) => ({ ...current, q: value.trim() }));
            setPage(0);
        }, 300);
    }

    const clearBuyer = useCallback(() => {
        setBuyerLabel(null);
        setFilters((current) => ({ ...current, buyerId: null }));
        setPage(0);
    }, []);

    const toggleMore = useCallback(() => setMoreOpen((open) => !open), []);

    // A link to the bare hash would change the URL without a hashchange event, leaving the order open.
    const backToList = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        pushPageEntry(ORDERS_HASH_ROOT);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    return {
        filters,
        handleFilterChange,
        search,
        handleSearchChange,
        buyerLabel,
        clearBuyer,
        hasFilters: hasOrderFilters(filters),
        rangeInvalid,
        moreOpen,
        toggleMore,
        page,
        setPage,
        selectedId,
        backToList,
        ordersQuery,
    };
}
