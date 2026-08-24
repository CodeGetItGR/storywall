'use client';

import { Gift, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useDeleteGiftAccount, useGiftAccount, useSaveGiftAccount } from '@/hooks/useGiftAccount';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';

export function GiftAccountSetup({ eventId, className = 'mt-3 border-t border-border/70 pt-3' }: { eventId: string; className?: string }) {
    const t = useTranslations('ManagePage.giftAccount');
    const account = useGiftAccount(eventId);
    const save = useSaveGiftAccount(eventId);
    const remove = useDeleteGiftAccount(eventId);
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const invalidIban = getErrorCode(save.error) === ERROR_CODES.INVALID_IBAN;
    const fieldErrors = getFieldErrors(save.error);

    function openEditor() {
        setOpen(true);
    }
    function closeEditor() {
        save.reset();
        setOpen(false);
    }
    function openDelete() {
        setDeleteOpen(true);
    }
    function closeDelete() {
        setDeleteOpen(false);
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await save.mutateAsync({
            iban: String(data.get('iban') ?? ''),
            accountHolder: String(data.get('accountHolder') ?? '').trim(),
            bankName: String(data.get('bankName') ?? '').trim(),
            note: String(data.get('note') ?? '').trim() || undefined,
        });
        setOpen(false);
    }

    async function confirmDelete() {
        await remove.mutateAsync();
        setDeleteOpen(false);
        setOpen(false);
    }

    return (
        <>
            <div className={className}>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-semibold text-ink">
                            <Gift className="h-4 w-4 text-rose-500" />
                            {t('title')}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                            {account.data ? t('configured', { holder: account.data.accountHolder }) : t('body')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openEditor}
                        disabled={account.isLoading}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        {account.data ? t('edit') : t('add')}
                    </button>
                </div>
            </div>

            <Modal open={open} onClose={closeEditor} size="md" closeLabel={t('cancel')}>
                <Modal.Body className="px-4 pb-5 pt-12 sm:px-5">
                    <form onSubmit={submit} className="space-y-4">
                        <div className="pr-8">
                            <h2 className="text-lg font-semibold text-ink">{t('editorTitle')}</h2>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{t('editorBody')}</p>
                        </div>
                        <label className="block text-sm font-semibold text-ink">
                            {t('iban')}
                            <input
                                name="iban"
                                required
                                maxLength={42}
                                defaultValue={account.data?.iban ?? ''}
                                className="mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            {(invalidIban || fieldErrors?.iban) && <span className="mt-1 block text-xs text-rose-600">{t('invalidIban')}</span>}
                        </label>
                        <label className="block text-sm font-semibold text-ink">
                            {t('accountHolder')}
                            <input
                                name="accountHolder"
                                required
                                maxLength={140}
                                defaultValue={account.data?.accountHolder ?? ''}
                                className="mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </label>
                        <label className="block text-sm font-semibold text-ink">
                            {t('bankName')}
                            <input
                                name="bankName"
                                required
                                maxLength={140}
                                defaultValue={account.data?.bankName ?? ''}
                                className="mt-1.5 w-full rounded-xl bg-surface-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </label>
                        <label className="block text-sm font-semibold text-ink">
                            {t('note')}
                            <textarea
                                name="note"
                                maxLength={500}
                                rows={3}
                                defaultValue={account.data?.note ?? ''}
                                className="mt-1.5 w-full resize-none rounded-xl bg-surface-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                {account.data && (
                                    <button
                                        type="button"
                                        onClick={openDelete}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {t('remove')}
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={save.isPending}
                                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('save')}
                            </button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <ConfirmActionModal
                open={deleteOpen}
                onCloseAction={closeDelete}
                onConfirmAction={confirmDelete}
                title={t('removeTitle')}
                body={t('removeBody')}
                confirmLabel={t('remove')}
                cancelLabel={t('cancel')}
                isConfirming={remove.isPending}
            />
        </>
    );
}
