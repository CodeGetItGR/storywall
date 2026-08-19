'use client';

import { Check, Copy, Gift, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeleteGiftAccount, useGiftAccount, useSaveGiftAccount } from '@/hooks/useGiftAccount';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

function formatIban(value: string) {
    return value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim();
}

export default function GiftsPage() {
    const t = useTranslations('GiftsPage');
    const router = useRouter();
    const event = useActiveEvent();
    const isHost = useIsHost();
    const eventId = event?.id ?? '';
    const account = useGiftAccount(event?.id ?? null);
    const save = useSaveGiftAccount(eventId);
    const remove = useDeleteGiftAccount(eventId);
    const [editing, setEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const canEdit = isHost && event?.status !== 'PURGED';

    const showForm = canEdit && (editing || account.data === null);

    function goBack() {
        router.back();
    }
    function cancelEditing() {
        setEditing(false);
    }
    function startEditing() {
        setEditing(true);
    }
    function openDelete() {
        setDeleteOpen(true);
    }
    function closeDelete() {
        setDeleteOpen(false);
    }

    async function submit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        await save.mutateAsync({
            iban: String(data.get('iban') ?? ''),
            accountHolder: String(data.get('accountHolder') ?? '').trim(),
            note: String(data.get('note') ?? '').trim() || undefined,
        });
        setEditing(false);
    }

    async function copyIban() {
        if (!account.data) return;
        await navigator.clipboard.writeText(account.data.iban);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function confirmDelete() {
        await remove.mutateAsync();
        setDeleteOpen(false);
    }

    const fieldErrors = getFieldErrors(save.error);
    const invalidIban = getErrorCode(save.error) === ERROR_CODES.INVALID_IBAN;

    return (
        <ModulePageShell maxWidth="xl" title={t('accountTitle')} icon={Gift} iconClassName="text-rose-500" backLabel={t('goBack')} onBack={goBack}>
            {account.isLoading && <p className="py-10 text-center text-sm text-ink-muted">{t('loading')}</p>}
            {account.error && <p className="py-10 text-center text-sm text-rose-600">{t('loadError')}</p>}

            {!account.isLoading && !account.error && showForm && (
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label htmlFor="gift-iban" className="text-sm font-semibold text-ink">
                            {t('fields.iban')}
                        </label>
                        <input
                            id="gift-iban"
                            name="iban"
                            required
                            maxLength={42}
                            defaultValue={account.data?.iban ?? ''}
                            className="mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 font-mono text-sm uppercase text-ink outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {(invalidIban || fieldErrors?.iban) && <p className="mt-1 text-xs text-rose-600">{t('invalidIban')}</p>}
                    </div>
                    <div>
                        <label htmlFor="gift-holder" className="text-sm font-semibold text-ink">
                            {t('fields.accountHolder')}
                        </label>
                        <input
                            id="gift-holder"
                            name="accountHolder"
                            required
                            maxLength={140}
                            defaultValue={account.data?.accountHolder ?? ''}
                            className="mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div>
                        <label htmlFor="gift-note" className="text-sm font-semibold text-ink">
                            {t('fields.note')}
                        </label>
                        <textarea
                            id="gift-note"
                            name="note"
                            maxLength={500}
                            rows={3}
                            defaultValue={account.data?.note ?? ''}
                            className="mt-1.5 w-full resize-none rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        {account.data && (
                            <button
                                type="button"
                                onClick={cancelEditing}
                                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-muted"
                            >
                                {t('cancel')}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={save.isPending}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            )}

            {!account.isLoading && !account.error && !showForm && account.data && (
                <div>
                    <p className="text-sm leading-6 text-ink-muted">{account.data.note || t('accountSubtitle')}</p>
                    <div className="mt-5 border-y border-border py-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('fields.accountHolder')}</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{account.data.accountHolder}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('fields.iban')}</p>
                        <p className="mt-1 break-all font-mono text-lg font-semibold tracking-wide text-ink">{formatIban(account.data.iban)}</p>
                        <button
                            type="button"
                            onClick={copyIban}
                            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink-muted"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            {copied ? t('copied') : t('copyIban')}
                        </button>
                    </div>
                    {canEdit && (
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={startEditing}
                                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-muted"
                            >
                                <Pencil className="h-4 w-4" />
                                {t('edit')}
                            </button>
                            <button
                                type="button"
                                onClick={openDelete}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('remove')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!account.isLoading && !account.error && !showForm && !account.data && (
                <p className="py-10 text-center text-sm text-ink-muted">{t(isHost ? 'emptyHost' : 'emptyMember')}</p>
            )}
            <ConfirmActionModal
                open={deleteOpen}
                onClose={closeDelete}
                onConfirm={confirmDelete}
                title={t('removeTitle')}
                body={t('removeBody')}
                confirmLabel={t('remove')}
                cancelLabel={t('cancel')}
                isConfirming={remove.isPending}
            />
        </ModulePageShell>
    );
}
