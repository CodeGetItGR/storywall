'use client';

import { AlertTriangle, Loader2, Snowflake, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useFreezeEvent, usePurgeEvent } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';

export function EventLifecyclePanel() {
    const t = useTranslations('AdminPage');
    const { focus } = useAdminNavigation();
    const freezeEvent = useFreezeEvent();
    const purgeEvent = usePurgeEvent();

    // Both actions run against the same event, so the id is asked for once.
    const [eventId, setEventId] = useState('');
    const [eventTitle, setEventTitle] = useState<string | null>(null);
    const [purgeConfirm, setPurgeConfirm] = useState('');
    const [frozenId, setFrozenId] = useState<string | null>(null);
    const [confirmFreeze, setConfirmFreeze] = useState(false);
    const [confirmPurge, setConfirmPurge] = useState(false);
    const [purgeResult, setPurgeResult] = useState<{ eventId: string; complete: boolean } | null>(null);
    const [appliedFocus, setAppliedFocus] = useState(focus);

    // Adjusting during render rather than in an effect: the prefilled id has to be
    // on screen the moment the panel opens, not one paint later.
    if (focus !== appliedFocus) {
        setAppliedFocus(focus);
        if (focus?.eventId) {
            setEventId(focus.eventId);
            setEventTitle(focus.eventTitle ?? null);
            setPurgeConfirm('');
            setFrozenId(null);
            setPurgeResult(null);
        }
    }

    const handleEventIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEventId(event.target.value);
        // The title only belongs to the id it arrived with.
        setEventTitle(null);
        setFrozenId(null);
        setPurgeResult(null);
    }, []);
    const handlePurgeConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setPurgeConfirm(event.target.value), []);

    const trimmedId = eventId.trim();
    const idIsValid = isUuid(trimmedId);
    const showIdError = trimmedId.length > 0 && !idIsValid;
    const purgeArmed = idIsValid && purgeConfirm.trim() === trimmedId;
    const eventLabel = eventTitle ?? trimmedId;

    function handleFreezeSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!idIsValid) return;
        setConfirmFreeze(true);
    }

    function handlePurgeSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!purgeArmed) return;
        setConfirmPurge(true);
    }

    const closeFreezeConfirm = useCallback(() => setConfirmFreeze(false), []);
    const closePurgeConfirm = useCallback(() => setConfirmPurge(false), []);

    const confirmFreezeAction = useCallback(async () => {
        setFrozenId(null);
        await freezeEvent.mutateAsync(trimmedId);
        setFrozenId(trimmedId);
        setConfirmFreeze(false);
    }, [freezeEvent, trimmedId]);

    const confirmPurgeAction = useCallback(async () => {
        setPurgeResult(null);
        const complete = await purgeEvent.mutateAsync(trimmedId);
        setPurgeResult({ eventId: trimmedId, complete });
        setPurgeConfirm('');
        setConfirmPurge(false);
    }, [purgeEvent, trimmedId]);

    return (
        <section className="space-y-5">
            <div className="border-b border-border pb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('lifecycle.title')}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('lifecycle.subtitle')}</p>

                <div className="mt-3 max-w-xl">
                    <AdminField label={t('lifecycle.eventIdField')} required>
                        <input
                            value={eventId}
                            onChange={handleEventIdChange}
                            required
                            spellCheck={false}
                            aria-invalid={showIdError}
                            className={adminInputClass('font-mono')}
                            placeholder={t('lifecycle.eventIdPlaceholder')}
                        />
                    </AdminField>
                    {eventTitle ? (
                        <p className="mt-1.5 text-sm font-semibold text-ink">{t('lifecycle.resolvedEvent', { title: eventTitle })}</p>
                    ) : (
                        <p className="mt-1.5 text-xs leading-5 text-ink-muted">{t('lifecycle.idSourceHint')}</p>
                    )}
                    {showIdError && <p className="mt-1 text-xs font-semibold text-status-danger">{t('lifecycle.idInvalid')}</p>}
                </div>
            </div>

            <form onSubmit={handleFreezeSubmit} className="border-b border-border pb-5">
                <h3 className="text-base font-semibold text-ink">{t('lifecycle.freezeTitle')}</h3>
                <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('lifecycle.freezeSubtitle')}</p>
                <button
                    type="submit"
                    disabled={freezeEvent.isPending || !idIsValid}
                    className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                    {freezeEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />}
                    {t('lifecycle.freeze')}
                </button>
                {freezeEvent.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(freezeEvent.error)}`)}</p>}
                {frozenId && !freezeEvent.error && (
                    <p className="mt-2 text-sm text-status-good">{t('lifecycle.freezeSuccess', { eventId: frozenId })}</p>
                )}
            </form>

            <form onSubmit={handlePurgeSubmit} className="border-b border-status-danger-wash pb-5">
                <h3 className="flex items-center gap-2 text-base font-semibold text-status-danger">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {t('lifecycle.purgeTitle')}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-status-danger">{t('lifecycle.purgeWarning')}</p>
                <div className="mt-3 max-w-xl">
                    <AdminField label={t('lifecycle.purgeConfirmField')} required>
                        <input
                            value={purgeConfirm}
                            onChange={handlePurgeConfirmChange}
                            spellCheck={false}
                            className={adminInputClass('font-mono')}
                            placeholder={t('lifecycle.purgeConfirmPlaceholder')}
                        />
                    </AdminField>
                </div>
                <button
                    type="submit"
                    disabled={purgeEvent.isPending || !purgeArmed}
                    className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-status-danger px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                    {purgeEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {t('lifecycle.purge')}
                </button>
                {purgeEvent.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(purgeEvent.error)}`)}</p>}
                {purgeResult && !purgeEvent.error && (
                    <p className={purgeResult.complete ? 'mt-2 text-sm text-status-good' : 'mt-2 text-sm text-status-warn'}>
                        {purgeResult.complete
                            ? t('lifecycle.purgeSuccess', { eventId: purgeResult.eventId })
                            : t('lifecycle.purgePartial', { eventId: purgeResult.eventId })}
                    </p>
                )}
            </form>

            <ConfirmActionModal
                open={confirmFreeze}
                onCloseAction={closeFreezeConfirm}
                title={t('lifecycle.freezeConfirmTitle', { event: eventLabel })}
                body={
                    <>
                        <p>{t('lifecycle.freezeConfirmBody')}</p>
                        <p className="mt-2 break-all font-mono text-xs text-ink-faint">{trimmedId}</p>
                    </>
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('lifecycle.freeze')}
                isConfirming={freezeEvent.isPending}
                onConfirmAction={confirmFreezeAction}
                tone="default"
                icon={<Snowflake className="h-5 w-5" aria-hidden="true" />}
            />

            <ConfirmActionModal
                open={confirmPurge}
                onCloseAction={closePurgeConfirm}
                title={t('lifecycle.purgeConfirmTitle', { event: eventLabel })}
                body={
                    <>
                        <p>{t('lifecycle.purgeConfirmBody')}</p>
                        <p className="mt-2 break-all font-mono text-xs text-ink-faint">{trimmedId}</p>
                        {!eventTitle && <p className="mt-2 font-semibold text-status-danger">{t('lifecycle.purgeUnverified')}</p>}
                    </>
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('lifecycle.purge')}
                isConfirming={purgeEvent.isPending}
                onConfirmAction={confirmPurgeAction}
                icon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
            />
        </section>
    );
}
