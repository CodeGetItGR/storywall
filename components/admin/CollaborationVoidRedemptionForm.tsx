'use client';

import { Loader2, Unlink2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useVoidCollaborationRedemption } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';

export function CollaborationVoidRedemptionForm() {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const voidRedemption = useVoidCollaborationRedemption();
    const [eventId, setEventId] = useState('');
    const [reason, setReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const trimmedEventId = eventId.trim();
    const trimmedReason = reason.trim();
    const canSubmit = isUuid(trimmedEventId) && trimmedReason.length > 0;

    const handleEventIdChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setEventId(event.target.value), []);
    const handleReasonChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value), []);
    const closeConfirm = useCallback(() => setConfirmOpen(false), []);

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (canSubmit) setConfirmOpen(true);
    }

    const confirmVoid = useCallback(async () => {
        await voidRedemption.mutateAsync({ eventId: trimmedEventId, input: { reason: trimmedReason } });
        setEventId('');
        setReason('');
        setConfirmOpen(false);
    }, [trimmedEventId, trimmedReason, voidRedemption]);

    return (
        <section className="border-t border-border pt-5">
            {/* Void attribution */}
            <h2 className="text-base font-semibold text-ink">{t('void.title')}</h2>
            <form onSubmit={handleSubmit} className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end">
                <AdminField label={t('void.eventId')} required>
                    <input value={eventId} onChange={handleEventIdChange} spellCheck={false} className={adminInputClass('font-mono')} />
                </AdminField>
                <AdminField label={t('void.reason')} required>
                    <textarea value={reason} onChange={handleReasonChange} maxLength={500} className={adminInputClass('min-h-10 resize-y')} />
                </AdminField>
                <button
                    type="submit"
                    disabled={!canSubmit || voidRedemption.isPending}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                    {voidRedemption.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink2 className="h-4 w-4" />}
                    {t('void.action')}
                </button>
            </form>
            {trimmedEventId && !isUuid(trimmedEventId) && <p className="mt-2 text-xs font-semibold text-status-danger">{t('void.invalidEventId')}</p>}
            {voidRedemption.isSuccess && <p className="mt-2 text-sm text-status-good">{t('void.success')}</p>}
            {voidRedemption.error && <p className="mt-2 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(voidRedemption.error)}`)}</p>}

            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={closeConfirm}
                title={t('void.confirmTitle')}
                body={t('void.confirmBody')}
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('void.action')}
                isConfirming={voidRedemption.isPending}
                onConfirmAction={confirmVoid}
            />
        </section>
    );
}
