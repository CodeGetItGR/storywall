'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { WishEditor } from '@/hooks/useWishEditor';

// One of the guest's own wishes, opened from "Your messages": change the text or the recording, or delete it.
export function WishEditSheet({ editor, maxLength }: { editor: WishEditor; maxLength: number }) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();

    function change(event: ChangeEvent<HTMLTextAreaElement>) {
        editor.changeDraft(event.target.value.slice(0, maxLength));
    }
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        void editor.save();
    }

    return (
        <>
            <Modal
                open={editor.isSheetOpen}
                onClose={editor.close}
                variant="sheet"
                size="sm"
                closeDisabled={editor.isSaving}
                ariaLabel={t('editTitle')}
                closeLabel={t('cancel')}
            >
                <Modal.Body className="px-5 pt-5 pb-6">
                    {/* Header */}
                    <h2 className="pr-8 text-base font-bold text-ink">{t('editTitle')}</h2>

                    <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
                        {/* Message */}
                        <textarea
                            value={editor.draft}
                            onChange={change}
                            maxLength={maxLength}
                            rows={6}
                            disabled={editor.isSaving}
                            aria-label={t('messageAriaLabel')}
                            className="min-h-40 w-full resize-none rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink transition-shadow outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        />
                        <span className="text-xs text-ink-faint">{t('charactersLeft', { current: editor.draft.length, max: maxLength })}</span>

                        {/* Recording */}
                        <div className="px-1 py-3">
                            <VoiceRecorder
                                recorder={editor.recorder}
                                disabled={editor.isSaving}
                                existing={editor.existingAudio}
                                onRemoveExisting={editor.removeExisting}
                            />
                        </div>

                        {/* Error */}
                        {editor.saveError ? (
                            <p role="alert" className="text-xs text-rose-600">
                                {toErrorMessage(editor.saveError)}
                            </p>
                        ) : null}

                        {/* Actions: a line above them keeps them apart from the recording */}
                        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                            <button
                                type="button"
                                onClick={editor.askDelete}
                                disabled={editor.isSaving}
                                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                            >
                                {t('delete')}
                            </button>
                            <button
                                type="submit"
                                disabled={!editor.canSave}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-40"
                            >
                                {editor.isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                {t('save')}
                            </button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={editor.isConfirmingDelete}
                onCloseAction={editor.cancelDelete}
                onConfirmAction={editor.confirmDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                isConfirming={editor.isDeleting}
                tone="danger"
            />
        </>
    );
}
