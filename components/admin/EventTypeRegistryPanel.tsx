'use client';

import { useList } from '@refinedev/core';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { EventTypeEditDrawer } from '@/components/admin/EventTypeEditDrawer';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function EventTypeRegistryPanel() {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const { result: eventTypesResult, query: eventTypesQuery } = useList<PlatformEventTypeResponseDto>({
        resource: 'platform-event-types',
        dataProviderName: 'platform-event-types',
        pagination: { mode: 'off' },
    });
    const [selectedEventType, setSelectedEventType] = useState<PlatformEventTypeResponseDto | null>(null);
    const eventTypes = useMemo(() => [...eventTypesResult.data].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypesResult.data]);

    function closeEditor() {
        setSelectedEventType(null);
    }

    const handleEditClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const eventTypeKey = event.currentTarget.dataset.eventTypeKey;
            const found = eventTypes.find((item) => item.eventTypeKey === eventTypeKey);
            if (found) setSelectedEventType(found);
        },
        [eventTypes]
    );

    return (
        <section className="space-y-4">
            <div className="rounded-lg border border-status-warn-wash bg-status-warn-wash/40 px-4 py-3 text-sm leading-6 text-status-warn">
                {t('eventTypes.notice')}
            </div>

            <section className="rounded-xl border border-border bg-card">
                {eventTypesQuery.isLoading && <p className="px-4 py-6 text-sm text-ink-muted">{t('eventTypes.loading')}</p>}
                {eventTypesQuery.error && (
                    <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(eventTypesQuery.error)}`)}</p>
                )}
                {!eventTypesQuery.isLoading && !eventTypesQuery.error && eventTypes.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('eventTypes.empty')}</p>
                )}

                {!eventTypesQuery.isLoading && !eventTypesQuery.error && eventTypes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-140 border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('fields.name')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('eventTypes.enabled')}</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {eventTypes.map((eventType) => (
                                    <tr key={eventType.eventTypeKey} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                        <td className="max-w-96 px-4 py-2.5">
                                            <p className="truncate font-semibold text-ink">{localizedText(eventType.name)}</p>
                                            <p className="truncate font-mono text-[11px] text-ink-faint">{eventType.eventTypeKey}</p>
                                            <p className="truncate text-[11px] text-ink-faint">{localizedText(eventType.tagline)}</p>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                                                    eventType.isEnabled
                                                        ? 'bg-status-good-wash text-status-good'
                                                        : 'bg-status-neutral-wash text-status-neutral'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'h-1.5 w-1.5 rounded-full',
                                                        eventType.isEnabled ? 'bg-status-good' : 'bg-status-neutral'
                                                    )}
                                                />
                                                {eventType.isEnabled ? t('eventTypes.enabled') : t('eventTypes.disabled')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <button
                                                type="button"
                                                data-event-type-key={eventType.eventTypeKey}
                                                onClick={handleEditClick}
                                                aria-label={t('eventTypes.edit')}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <EventTypeEditDrawer eventType={selectedEventType} onCloseAction={closeEditor} />
        </section>
    );
}
