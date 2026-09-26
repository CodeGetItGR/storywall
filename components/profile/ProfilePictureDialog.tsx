'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PROFILE_PICTURE_ACCEPT } from '@/hooks/useProfilePictureUpload';

type ProfilePictureDialogProps = {
    open: boolean;
    previewUrl: string | null;
    error: string | null;
    isUploading: boolean;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ProfilePictureDialog({ open, previewUrl, error, isUploading, onFileChange, onConfirm, onCancel }: ProfilePictureDialogProps) {
    const t = useTranslations('ProfilePage.picture');

    return (
        <Modal open={open} onClose={onCancel} size="sm" closeLabel={t('cancel')} showCloseButton={!isUploading}>
            <Modal.Body className="px-4 pt-5 pb-4 sm:px-5">
                <div className="flex flex-col gap-5">
                    {/* Header */}
                    <h2 className="pr-10 text-base font-semibold text-ink">{t('title')}</h2>

                    {/* Preview */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative h-40 w-40 overflow-hidden rounded-full bg-surface-muted ring-2 ring-primary/20">
                            {previewUrl && <ProtectedImage src={previewUrl} alt="" fill className="object-cover" sizes="160px" />}
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                                    <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
                                </div>
                            )}
                        </div>
                        <label
                            htmlFor="profile-picture-dialog-input"
                            aria-disabled={isUploading}
                            className="cursor-pointer text-sm font-medium text-primary hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
                        >
                            {t('chooseAnother')}
                        </label>
                        <input
                            id="profile-picture-dialog-input"
                            type="file"
                            accept={PROFILE_PICTURE_ACCEPT}
                            className="sr-only"
                            disabled={isUploading}
                            onChange={onFileChange}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p role="alert" className="text-center text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isUploading} className="rounded-full px-4">
                            {t('cancel')}
                        </Button>
                        <Button type="button" onClick={onConfirm} disabled={isUploading} className="gap-2 rounded-full px-4">
                            {isUploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {isUploading ? t('saving') : t('save')}
                        </Button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}
