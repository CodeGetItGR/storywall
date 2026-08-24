'use client';

import { useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { adminErrorMessageKey, checked } from '@/lib/adminUtils';
import type { PlatformEventTypePatchDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

export function EventTypeEditDrawer({ eventType, onCloseAction }: { eventType: PlatformEventTypeResponseDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const queryClient = useQueryClient();
    const localizedText = useLocalizedText();

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
        onCloseAction();
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPendingInput({
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
                subtitle={eventType ? localizedText(eventType.name) : undefined}
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
                        <div className="space-y-1 rounded-lg border border-border bg-canvas/60 px-3.5 py-3">
                            <p className="text-sm font-semibold text-ink">{localizedText(eventType.name)}</p>
                            <p className="text-xs leading-snug text-ink-faint">{localizedText(eventType.tagline)}</p>
                        </div>

                        <div className="w-28">
                            <AdminField label={t('fields.sort')} optional>
                                <input name="sortOrder" type="number" min={0} defaultValue={eventType.sortOrder} className={adminInputClass()} />
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
                onCloseAction={closeConfirmation}
                title={t('eventTypes.confirmTitle', { eventType: eventType ? localizedText(eventType.name) : '' })}
                body={t('eventTypes.confirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={mutation.isPending}
                onConfirmAction={confirmUpdate}
                tone="default"
                icon={mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
