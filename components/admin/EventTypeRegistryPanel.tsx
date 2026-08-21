'use client';

import { useList, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { adminErrorMessageKey, checked, emptyToNull } from '@/lib/adminUtils';
import type { PlatformEventTypePatchDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function EventTypeEditDrawer({ eventType, onClose }: { eventType: PlatformEventTypeResponseDto | null; onClose: () => void }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();

    const { mutateAsync: updateEventType, mutation } = useUpdate<PlatformEventTypeResponseDto>({
        dataProviderName: 'platform-event-types',
        mutationOptions: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: adminKeys.platformEventTypes });
                queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
            },
        },
    });
    const [pendingInput, setPendingInput] = useState<PlatformEventTypePatchDto | null>(null);

    function close() {
        mutation.reset();
        setPendingInput(null);
        onClose();
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPendingInput({
            name: String(formData.get('name') ?? '').trim(),
            description: emptyToNull(formData.get('description')),
            sortOrder: Number(formData.get('sortOrder') ?? eventType?.sortOrder ?? 0),
            isEnabled: checked(formData, 'isEnabled'),
        });
    }

    async function confirmUpdate() {
        if (!eventType || !pendingInput) return;
        await updateEventType({ resource: 'platform-event-types', id: eventType.eventTypeKey, values: pendingInput });
        close();
    }

    function closeConfirmation() {
        setPendingInput(null);
    }

    return (
        <>
            <AdminDrawer
                open={Boolean(eventType)}
                onClose={close}
                closeLabel={t('cancel')}
                title={t('eventTypes.editTitle')}
                subtitle={eventType?.name}
                footer={
                    <>
                        <div />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={close}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form="event-type-edit-form"
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                {eventType && (
                    <form key={eventType.eventTypeKey} id="event-type-edit-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                            <AdminField label={t('fields.name')} required>
                                <input name="name" required maxLength={100} defaultValue={eventType.name} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.sort')} optional>
                                <input
                                    name="sortOrder"
                                    type="number"
                                    min={0}
                                    defaultValue={eventType.sortOrder}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.description')} optional className="col-span-2">
                                <input name="description" defaultValue={eventType.description ?? ''} className={adminInputClass()} />
                            </AdminField>
                        </div>

                        <label className="inline-flex items-center gap-2 border-y border-border py-3 text-sm font-semibold text-ink-muted">
                            <input type="checkbox" name="isEnabled" defaultChecked={eventType.isEnabled} className="h-4 w-4 accent-primary" />
                            <span>
                                {t('eventTypes.enabled')} <span className="text-ink-faint">({tCommon('optional')})</span>
                            </span>
                        </label>

                        {mutation.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(mutation.error)}`)}</p>}
                    </form>
                )}
            </AdminDrawer>

            <ConfirmActionModal
                open={Boolean(pendingInput)}
                onClose={closeConfirmation}
                title={t('eventTypes.confirmTitle', { eventType: eventType?.name ?? '' })}
                body={t('eventTypes.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={mutation.isPending}
                onConfirm={confirmUpdate}
                tone="default"
                icon={mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}

export function EventTypeRegistryPanel() {
    const t = useTranslations('AdminPage');
    const { result: eventTypesResult, query: eventTypesQuery } = useList<PlatformEventTypeResponseDto>({
        resource: 'platform-event-types',
        dataProviderName: 'platform-event-types',
        pagination: { mode: 'off' },
    });
    const [selectedEventType, setSelectedEventType] = useState<PlatformEventTypeResponseDto | null>(null);
    const eventTypes = useMemo(
        () => [...eventTypesResult.data].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesResult.data]
    );

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
                        <table className="w-full min-w-[560px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-4 py-2.5 font-bold">{t('fields.name')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('fields.sort')}</th>
                                    <th className="px-3 py-2.5 font-bold">{t('eventTypes.enabled')}</th>
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {eventTypes.map((eventType) => (
                                    <tr key={eventType.eventTypeKey} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                        <td className="max-w-96 px-4 py-2.5">
                                            <p className="truncate font-semibold text-ink">{eventType.name}</p>
                                            <p className="truncate font-mono text-[11px] text-ink-faint">{eventType.eventTypeKey}</p>
                                            {eventType.description && (
                                                <p className="truncate text-[11px] text-ink-faint">{eventType.description}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 tabular-nums text-ink-muted">{eventType.sortOrder}</td>
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

            <EventTypeEditDrawer eventType={selectedEventType} onClose={closeEditor} />
        </section>
    );
}
