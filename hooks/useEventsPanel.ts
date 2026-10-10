'use client';

import { type ChangeEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { useAdminEvents } from '@/hooks/useAdminEvents';
import {
    type AdminEventFilters,
    EMPTY_EVENT_FILTERS,
    type EventRestrictionFilter,
    EVENTS_HASH_ROOT,
    EVENTS_PAGE_SIZE,
    hasEventFilters,
    parseEventsHash,
} from '@/lib/adminEvents';
import type { EventStatus } from '@/lib/api/types';
import { pushPageEntry } from '@/lib/overlayHistory';

function currentEventId(): string | null {
    return typeof window === 'undefined' ? null : parseEventsHash(window.location.hash);
}

// The list's filters and page, and which event the hash has open. The list keeps its
// state while an event is open, so Back returns to the same page of the same results.
export function useEventsPanel() {
    const { focus } = useAdminNavigation();
    // Arriving from an account's drawer narrows the list to the events that account hosts.
    const [filters, setFilters] = useState<AdminEventFilters>(() => ({ ...EMPTY_EVENT_FILTERS, hostUserId: focus?.hostUserId ?? null }));
    const [hostLabel, setHostLabel] = useState<string | null>(focus?.hostLabel ?? null);
    const [search, setSearchState] = useState('');
    const [planCode, setPlanCodeState] = useState('');
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(currentEventId);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const eventsQuery = useAdminEvents({ filters, page, size: EVENTS_PAGE_SIZE });

    useEffect(() => {
        function syncFromHash() {
            setSelectedId(currentEventId());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    useEffect(() => {
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, []);

    // Typed filters wait for a pause in typing, so each keystroke doesn't fetch a page.
    const debounce = useCallback((apply: () => void) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            apply();
            setPage(0);
        }, 300);
    }, []);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.currentTarget;
        setSearchState(value);
        debounce(() => setFilters((current) => ({ ...current, q: value.trim() })));
    }

    function handlePlanCodeChange(event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.currentTarget;
        setPlanCodeState(value);
        debounce(() => setFilters((current) => ({ ...current, planCode: value.trim().toUpperCase() })));
    }

    const handleStatusChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.currentTarget;
        setFilters((current) => ({ ...current, status: value ? (value as EventStatus) : null }));
        setPage(0);
    }, []);

    const handleRestrictionChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const restriction = event.currentTarget.value as EventRestrictionFilter;
        setFilters((current) => ({ ...current, restriction }));
        setPage(0);
    }, []);

    const handleIncludeDeletedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const includeDeleted = event.currentTarget.checked;
        setFilters((current) => ({ ...current, includeDeleted }));
        setPage(0);
    }, []);

    const clearHost = useCallback(() => {
        setHostLabel(null);
        setFilters((current) => ({ ...current, hostUserId: null }));
        setPage(0);
    }, []);

    // A link to the bare hash would change the URL without a hashchange event, leaving the event open.
    const backToList = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        pushPageEntry(EVENTS_HASH_ROOT);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    return {
        filters,
        search,
        handleSearchChange,
        planCode,
        handlePlanCodeChange,
        handleStatusChange,
        handleRestrictionChange,
        handleIncludeDeletedChange,
        hostLabel,
        clearHost,
        hasFilters: hasEventFilters(filters),
        page,
        setPage,
        selectedId,
        backToList,
        eventsQuery,
    };
}
