'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ImageDropInput } from '@/components/common/ImageDropInput';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUploadAccept } from '@/hooks/useUploadAccept';

type DemoAddGuestModalProps = {
    open: boolean;
    isAdding: boolean;
    error: unknown;
    // The guest was created but its photo didn't upload: only the photo is left to submit.
    photoPending: boolean;
    onCloseAction: () => void;
    onSubmitAction: (event: React.SubmitEvent<HTMLFormElement>) => void;
};

export function DemoAddGuestModal({ open, isAdding, error, photoPending, onCloseAction, onSubmitAction }: DemoAddGuestModalProps) {
    const t = useTranslations('DemoActAs');
    const toErrorMessage = useApiErrorMessage();
    const uploadAccept = useUploadAccept();

    return (
        <Modal open={open} onClose={onCloseAction} size="sm" closeLabel={t('cancel')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <form onSubmit={onSubmitAction} className="flex flex-col gap-4 text-ink">
                    {/* Name */}
                    <h2 className="text-base font-semibold">{photoPending ? t('uploadPhoto') : t('addGuestTitle')}</h2>
                    {!photoPending && (
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="font-medium">{t('guestName')}</span>
                            <input
                                name="displayName"
                                required
                                maxLength={150}
                                autoComplete="off"
                                className="min-h-10 rounded-lg border border-border bg-background px-3 text-base"
                            />
                        </label>
                    )}

                    {/* Photo */}
                    <div className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">{photoPending ? t('photoRequired') : t('photo')}</span>
                        <ImageDropInput name="photo" accept={uploadAccept.profilePicture} required={photoPending} disabled={isAdding} />
                    </div>
                    {photoPending && <p className="text-sm text-ink-muted">{t('photoFailed')}</p>}
                    {Boolean(error) && <p className="text-sm text-rose-600">{toErrorMessage(error)}</p>}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={isAdding}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isAdding}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
                        >
                            {isAdding && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {photoPending ? t('uploadPhoto') : t('add')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
