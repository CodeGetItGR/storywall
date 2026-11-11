'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminInvitationThemes } from '@/hooks/useAdminInvitationThemes';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import {
    type AdminInvitationThemeDto,
    filterInvitationThemes,
    INVITATION_THEME_EVENT_TYPES,
    INVITATION_THEME_STATUS_FILTERS,
    type InvitationThemeEventTypeFilter,
    type InvitationThemeStatusFilter,
    themeEventTypes,
} from '@/lib/adminInvitationThemes';

export type InvitationThemeNameModalState = { mode: 'create' } | { mode: 'duplicate'; sourceId: string; sourceName: string } | null;

export type EventTypeOption = { key: string; label: string };

// The themes list: filters, and which theme the drawer, the name modal and the preview show.
export function useInvitationThemesCatalog() {
    const t = useTranslations('AdminPage.invitationThemes');
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
        visibleThemes,
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
