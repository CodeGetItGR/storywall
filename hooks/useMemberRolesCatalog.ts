'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminMemberRoles, useMoveMemberRole } from '@/hooks/useAdminMemberRoles';
import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { filterRoles, type RoleStatusFilter, sortRoles } from '@/lib/memberRoles';
import { nextSortOrder } from '@/lib/sortOrder';

export type MemberRoleDrawerState = { open: false } | { open: true; role: MemberRoleCatalogDto | null };

export function useMemberRolesCatalog() {
    const locale = useLocale() as Locale;
    const eventTypesQuery = useAdminPlatformEventTypes();
    const eventTypes = useMemo(
        () => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data],
    );
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const eventTypeKey = selectedKey ?? eventTypes[0]?.eventTypeKey ?? null;

    const rolesQuery = useAdminMemberRoles(eventTypeKey);
    const roles = useMemo(() => sortRoles(rolesQuery.data ?? []), [rolesQuery.data]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<RoleStatusFilter>('ALL');
    const visibleRoles = useMemo(() => filterRoles(roles, search, status, locale), [locale, roles, search, status]);

    const move = useMoveMemberRole(roles);
    // Arrows move a role within the full list, so they only work while nothing is hidden.
    const canReorder = !search.trim() && status === 'ALL' && !move.isPending;
    const [drawer, setDrawer] = useState<MemberRoleDrawerState>({ open: false });

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedKey(event.currentTarget.value);
        setDrawer({ open: false });
    }, []);
    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openCreate = useCallback(() => setDrawer({ open: true, role: null }), []);
    const openEdit = useCallback(
        (roleId: string) => {
            const role = roles.find((item) => item.id === roleId);
            if (role) setDrawer({ open: true, role });
        },
        [roles],
    );
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

    return {
        eventTypes,
        eventTypeKey,
        roles,
        visibleRoles,
        search,
        status,
        setStatus,
        canReorder,
        moveError: move.error,
        drawer,
        createSortOrder: nextSortOrder(roles),
        isLoading: eventTypesQuery.isLoading || rolesQuery.isLoading,
        error: eventTypesQuery.error ?? rolesQuery.error ?? null,
        handleEventTypeChange,
        handleSearchChange,
        openCreate,
        openEdit,
        closeDrawer,
        moveRole: move.move,
    };
}
