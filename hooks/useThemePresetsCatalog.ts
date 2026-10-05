'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminThemePresets, useMoveThemePreset } from '@/hooks/useAdminThemePresets';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { Locale } from '@/i18n/config';
import { filterThemePresets, sortThemePresets, type ThemePresetStatusFilter } from '@/lib/adminThemePresets';
import type { AdminThemePresetDto } from '@/lib/api/types';
import { bySortOrder, nextSortOrder } from '@/lib/sortOrder';

export type ThemePresetDrawerState = { open: false } | { open: true; preset: AdminThemePresetDto | null };

export function useThemePresetsCatalog() {
    const locale = useLocale() as Locale;
    const localizedText = useLocalizedText();
    const presetsQuery = useAdminThemePresets();
    const eventTypesQuery = useAdminPlatformEventTypes();

    const presets = useMemo(() => sortThemePresets(presetsQuery.data ?? []), [presetsQuery.data]);
    const eventTypes = useMemo(
        () =>
            [...(eventTypesQuery.data ?? [])]
                .sort(bySortOrder)
                .map((eventType) => ({ eventTypeKey: eventType.eventTypeKey, label: localizedText(eventType.name, eventType.eventTypeKey) })),
        [eventTypesQuery.data, localizedText],
    );
    const eventTypeLabels = useMemo(
        () => Object.fromEntries(eventTypes.map((eventType) => [eventType.eventTypeKey, eventType.label])) as Record<string, string>,
        [eventTypes],
    );

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ThemePresetStatusFilter>('ALL');
    const visiblePresets = useMemo(() => filterThemePresets(presets, search, status, locale), [locale, presets, search, status]);

    const move = useMoveThemePreset(presets);
    // Arrows move a preset within the full list, so they only work while nothing is hidden.
    const canReorder = !search.trim() && status === 'ALL' && !move.isPending;
    const [drawer, setDrawer] = useState<ThemePresetDrawerState>({ open: false });

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openCreate = useCallback(() => setDrawer({ open: true, preset: null }), []);
    const openEdit = useCallback(
        (presetId: string) => {
            const preset = presets.find((item) => item.id === presetId);
            if (preset) setDrawer({ open: true, preset });
        },
        [presets],
    );
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

    return {
        presets,
        visiblePresets,
        eventTypes,
        eventTypeLabels,
        search,
        status,
        setStatus,
        canReorder,
        moveError: move.error,
        drawer,
        createSortOrder: nextSortOrder(presets),
        isLoading: presetsQuery.isLoading || eventTypesQuery.isLoading,
        error: presetsQuery.error ?? eventTypesQuery.error ?? null,
        handleSearchChange,
        openCreate,
        openEdit,
        closeDrawer,
        movePreset: move.move,
    };
}
