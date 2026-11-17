'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { adminInvitationThemeKeys, useAdminInvitationThemes } from '@/hooks/useAdminInvitationThemes';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import {
    type AdminInvitationThemeDto,
    type AdminInvitationThemeSummaryDto,
    filterInvitationThemes,
    INVITATION_THEME_EVENT_TYPES,
    INVITATION_THEME_STATUS_FILTERS,
    type InvitationThemeEventTypeFilter,
    type InvitationThemeStatusFilter,
    themeEventTypes,
    themesOfEventType,
} from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export type InvitationThemeNameModalState = { mode: 'create' } | { mode: 'duplicate'; sourceId: string; sourceName: string } | null;

export type EventTypeOption = { key: string; label: string };

const themeIdOf = (theme: AdminInvitationThemeSummaryDto) => theme.id;

// The arrows and drag and drop of one event type's themes: one sort order PATCH per moved theme.
export function useInvitationThemeMove(themes: AdminInvitationThemeSummaryDto[]) {
    const queryClient = useQueryClient();
    return useSortOrderMove({
        items: themes,
        idOf: themeIdOf,
        patch: ({ id, sortOrder }) => api.patch(endpoints.admin.invitationThemes.byId(id), { sortOrder }),
        refresh: () => void queryClient.invalidateQueries({ queryKey: adminInvitationThemeKeys.list() }),
    });
}

// The themes list: filters, and which theme the drawer, the name modal and the preview show.
export function useInvitationThemesCatalog() {
    const t = useTranslations('AdminPage.invitationThemes');
    const tAdmin = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const themesQuery = useAdminInvitationThemes();
    const eventTypesQuery = useAdminPlatformEventTypes();

    const themes = useMemo(() => themesQuery.data ?? [], [themesQuery.data]);
    // Event type names come from the registry; a type it doesn't know shows its key.
    const eventTypeLabels = useMemo(() => {
        const labels: Record<string, string> = {};
        for (const eventType of eventTypesQuery.data ?? []) labels[eventType.eventTypeKey] = localizedText(eventType.name, eventType.eventTypeKey);
        return labels;
    }, [eventTypesQuery.data, localizedText]);
    const labelOf = useCallback((key: string) => eventTypeLabels[key] ?? key, [eventTypeLabels]);
    const eventTypeFilterOptions = useMemo(
        () => [{ value: 'ALL', label: t('filterAll') }, ...themeEventTypes(themes).map((key) => ({ value: key, label: labelOf(key) }))],
        [labelOf, t, themes],
    );
    const statusFilterOptions = useMemo(
        () =>
            INVITATION_THEME_STATUS_FILTERS.map((value) => ({ value, label: value === 'ALL' ? t('filterAll') : t(`status.${value}`) })),
        [t],
    );
    const createEventTypes = useMemo<EventTypeOption[]>(
        () => INVITATION_THEME_EVENT_TYPES.map((key) => ({ key, label: labelOf(key) })),
        [labelOf],
    );

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<InvitationThemeStatusFilter>('ALL');
    const [eventType, setEventType] = useState<InvitationThemeEventTypeFilter>('ALL');
    const visibleThemes = useMemo(() => filterInvitationThemes(themes, { search, status, eventType }), [eventType, search, status, themes]);

    // Themes are ordered within their event type, so moving one needs one event type picked and nothing else hidden.
    const themesOfType = useMemo(() => (eventType === 'ALL' ? [] : themesOfEventType(themes, eventType)), [eventType, themes]);
    const move = useInvitationThemeMove(themesOfType);
    const canReorder = eventType !== 'ALL' && status === 'ALL' && !search.trim() && !move.isPending;
    const reorderHint = eventType === 'ALL' ? tAdmin('order.pickKind') : undefined;

    const [drawerThemeId, setDrawerThemeId] = useState<string | null>(null);
    const [nameModal, setNameModal] = useState<InvitationThemeNameModalState>(null);
    const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
    // The list's name for the theme, for the drawer's title while the whole theme loads.
    const drawerTitle = themes.find((theme) => theme.id === drawerThemeId)?.name ?? '';

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openDrawer = useCallback((themeId: string) => setDrawerThemeId(themeId), []);
    const closeDrawer = useCallback(() => setDrawerThemeId(null), []);
    const openCreate = useCallback(() => setNameModal({ mode: 'create' }), []);
    const openDuplicate = useCallback((theme: AdminInvitationThemeDto) => setNameModal({ mode: 'duplicate', sourceId: theme.id, sourceName: theme.name }), []);
    const closeNameModal = useCallback(() => setNameModal(null), []);
    // A new theme or a copy opens in the drawer, in place of the theme it was copied from.
    const handleNamed = useCallback((theme: AdminInvitationThemeDto) => {
        setNameModal(null);
        setDrawerThemeId(theme.id);
    }, []);
    const openPreview = useCallback((themeId: string) => setPreviewThemeId(themeId), []);
    const closePreview = useCallback(() => setPreviewThemeId(null), []);

    return {
        themes,
        visibleThemes: move.arrange(visibleThemes),
        canReorder,
        reorderHint,
        moveError: move.error,
        moveTheme: move.move,
        reorderTheme: move.reorder,
        eventTypeLabels,
        eventTypeFilterOptions,
        statusFilterOptions,
        createEventTypes,
        search,
        status,
        eventType,
        setStatus,
        setEventType,
        handleSearchChange,
        isLoading: themesQuery.isLoading,
        error: themesQuery.error ?? null,
        drawerThemeId,
        drawerTitle,
        openDrawer,
        closeDrawer,
        nameModal,
        openCreate,
        openDuplicate,
        closeNameModal,
        handleNamed,
        previewThemeId,
        openPreview,
        closePreview,
    };
}
