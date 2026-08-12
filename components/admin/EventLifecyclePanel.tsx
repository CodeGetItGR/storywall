'use client';

import { AlertTriangle, Loader2, Snowflake, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useFreezeEvent, usePurgeEvent } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function EventLifecyclePanel() {
    const t = useTranslations('AdminPage');
    const freezeEvent = useFreezeEvent();
    const purgeEvent = usePurgeEvent();

    const [frozenId, setFrozenId] = useState<string | null>(null);
    const [purgeId, setPurgeId] = useState('');
    const [purgeConfirm, setPurgeConfirm] = useState('');
    const [pendingFreeze, setPendingFreeze] = useState<{ eventId: string; form: HTMLFormElement } | null>(null);
    const [pendingPurgeId, setPendingPurgeId] = useState<string | null>(null);
    const [purgeResult, setPurgeResult] = useState<{ eventId: string; complete: boolean } | null>(null);

    function handleFreeze(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const eventId = String(new FormData(form).get('eventId') ?? '').trim();
        if (!eventId) return;
        setPendingFreeze({ eventId, form });
    }

    function handleFreezeConfirmClose() {
        setPendingFreeze(null);
    }

    async function handleFreezeConfirm() {
        if (!pendingFreeze) return;
        setFrozenId(null);
        await freezeEvent.mutateAsync(pendingFreeze.eventId);
        setFrozenId(pendingFreeze.eventId);
        pendingFreeze.form.reset();
        setPendingFreeze(null);
    }

    function handlePurge(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const eventId = purgeId.trim();
        if (!eventId || purgeConfirm.trim() !== eventId) return;
        setPendingPurgeId(eventId);
    }

    function handlePurgeConfirmClose() {
        setPendingPurgeId(null);
    }

    async function handlePurgeConfirm() {
        if (!pendingPurgeId) return;
        setPurgeResult(null);
        const complete = await purgeEvent.mutateAsync(pendingPurgeId);
        setPurgeResult({ eventId: pendingPurgeId, complete });
        setPurgeId('');
        setPurgeConfirm('');
        setPendingPurgeId(null);
    }

    const handlePurgeIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setPurgeId(event.target.value), []);
    const handlePurgeConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setPurgeConfirm(event.target.value), []);

    const purgeArmed = purgeId.trim().length > 0 && purgeConfirm.trim() === purgeId.trim();

    return (
        <section className="space-y-4">
            <form onSubmit={handleFreeze} className="border-b border-border pb-4">
                <h2 className="text-base font-semibold text-ink">{t('lifecycle.freezeTitle')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('lifecycle.freezeSubtitle')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AdminField label={t('lifecycle.eventIdField')} required>
                        <input name="eventId" required className={adminInputClass()} placeholder={t('lifecycle.eventIdPlaceholder')} />
                    </AdminField>
                    <button
                        type="submit"
                        disabled={freezeEvent.isPending}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {freezeEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />}
                        {t('lifecycle.freeze')}
                    </button>
                </div>
                {freezeEvent.error && <p className="mt-2 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(freezeEvent.error)}`)}</p>}
                {frozenId && !freezeEvent.error && <p className="mt-2 text-sm text-emerald-700">{t('lifecycle.freezeSuccess', { eventId: frozenId })}</p>}
            </form>

            <form onSubmit={handlePurge} className="border-b border-rose-200 pb-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-rose-700">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {t('lifecycle.purgeTitle')}
                </h2>
                <p className="mt-1 text-sm text-rose-700">{t('lifecycle.purgeWarning')}</p>
                <div className="mt-3 grid gap-3">
                    <AdminField label={t('lifecycle.eventIdField')} required>
                        <input
                            value={purgeId}
                            onChange={handlePurgeIdChange}
                            required
                            className={adminInputClass()}
                            placeholder={t('lifecycle.eventIdPlaceholder')}
                        />
                    </AdminField>
                    <AdminField label={t('lifecycle.purgeConfirmField')} required>
                        <input
                            value={purgeConfirm}
                            onChange={handlePurgeConfirmChange}
                            className={adminInputClass()}
                            placeholder={t('lifecycle.purgeConfirmPlaceholder')}
                        />
                    </AdminField>
                    <button
                        type="submit"
                        disabled={purgeEvent.isPending || !purgeArmed}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {purgeEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {t('lifecycle.purge')}
                    </button>
                </div>
                {purgeEvent.error && <p className="mt-2 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(purgeEvent.error)}`)}</p>}
                {purgeResult && !purgeEvent.error && (
                    <p className={purgeResult.complete ? 'mt-2 text-sm text-emerald-700' : 'mt-2 text-sm text-amber-700'}>
                        {purgeResult.complete
                            ? t('lifecycle.purgeSuccess', { eventId: purgeResult.eventId })
                            : t('lifecycle.purgePartial', { eventId: purgeResult.eventId })}
                    </p>
                )}
            </form>

            <ConfirmActionModal
                open={Boolean(pendingFreeze)}
                onClose={handleFreezeConfirmClose}
                title={t('lifecycle.freezeConfirmTitle', { eventId: pendingFreeze?.eventId ?? '' })}
                body={t('lifecycle.freezeConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('lifecycle.freeze')}
                isConfirming={freezeEvent.isPending}
                onConfirm={handleFreezeConfirm}
                tone="default"
                icon={<Snowflake className="h-5 w-5" aria-hidden="true" />}
            />

            <ConfirmActionModal
                open={Boolean(pendingPurgeId)}
                onClose={handlePurgeConfirmClose}
                title={t('lifecycle.purgeConfirmTitle', { eventId: pendingPurgeId ?? '' })}
                body={t('lifecycle.purgeConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('lifecycle.purge')}
                isConfirming={purgeEvent.isPending}
                onConfirm={handlePurgeConfirm}
                icon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
            />
        </section>
    );
}
