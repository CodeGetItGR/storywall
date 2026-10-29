'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminQrCardTemplates, useMoveQrCardTemplate } from '@/hooks/useAdminQrCardTemplates';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { Locale } from '@/i18n/config';
import { filterQrCardTemplates, type QrCardStatusFilter, sortQrCardTemplates } from '@/lib/adminQrCards';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { bySortOrder, nextSortOrder } from '@/lib/sortOrder';

export type QrCardTemplateDrawerState = { open: false } | { open: true; template: AdminQrCardTemplateDto | null };

export function useQrCardTemplatesCatalog() {
    const locale = useLocale() as Locale;
    const localizedText = useLocalizedText();
    const templatesQuery = useAdminQrCardTemplates();
    const eventTypesQuery = useAdminPlatformEventTypes();

    const templates = useMemo(() => sortQrCardTemplates(templatesQuery.data ?? []), [templatesQuery.data]);
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
    const [status, setStatus] = useState<QrCardStatusFilter>('ALL');
    const visibleTemplates = useMemo(() => filterQrCardTemplates(templates, search, status, locale), [locale, templates, search, status]);

    const move = useMoveQrCardTemplate(templates);
    // Arrows move a design within the full list, so they only work while nothing is hidden.
    const canReorder = !search.trim() && status === 'ALL' && !move.isPending;
    const [drawer, setDrawer] = useState<QrCardTemplateDrawerState>({ open: false });

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openCreate = useCallback(() => setDrawer({ open: true, template: null }), []);
    const openEdit = useCallback(
        (templateId: string) => {
            const template = templates.find((item) => item.id === templateId);
            if (template) setDrawer({ open: true, template });
        },
        [templates],
    );
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

    return {
        templates,
        visibleTemplates: move.arrange(visibleTemplates),
        eventTypes,
        eventTypeLabels,
        search,
        status,
        setStatus,
        canReorder,
        moveError: move.error,
        drawer,
        createSortOrder: nextSortOrder(templates),
        isLoading: templatesQuery.isLoading || eventTypesQuery.isLoading,
        error: templatesQuery.error ?? eventTypesQuery.error ?? null,
        handleSearchChange,
        openCreate,
        openEdit,
        closeDrawer,
        moveTemplate: move.move,
        reorderTemplate: move.reorder,
    };
}
