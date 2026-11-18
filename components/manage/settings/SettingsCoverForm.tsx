'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { SettingsSaveButton } from '@/components/manage/settings/SettingsSaveButton';
import { useCoverPhotoForm } from '@/hooks/useCoverPhotoForm';
import { useUploadAccept } from '@/hooks/useUploadAccept';
import type { EventDetailResponseDto } from '@/lib/api/types';

// The cover photo editor: today's picker. A picked photo shows here and becomes the cover on save.
export function SettingsCoverForm({ event, canUpload, onSavedAction }: { event: EventDetailResponseDto; canUpload: boolean; onSavedAction: () => void }) {
    const t = useTranslations('ManagePage.settings.coverPhoto');
    const tAlt = useTranslations('ImageAlt');
    const uploadAccept = useUploadAccept();
    const fileRef = useRef<HTMLInputElement>(null);
    const form = useCoverPhotoForm({ event, canUpload, fileRef, onSaved: onSavedAction });

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            {/* Photo */}
            {form.coverPreview ? (
                <div className="relative aspect-21/9 overflow-hidden rounded-[1rem] bg-surface-muted">
                    <ProtectedImage src={form.coverPreview} alt={tAlt('eventCover')} fill className="object-cover" sizes="(min-width: 1024px) 480px, 100vw" />
                    {form.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
                        </div>
                    )}
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={form.handleChangeCoverClick}
                            className="rounded-full bg-ink/60 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/80"
                        >
                            {t('change')}
                        </button>
                        {form.hasPendingCover && (
                            <button
                                type="button"
                                onClick={form.handleRemovePendingCover}
                                aria-label={t('remove')}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={form.handleChangeCoverClick}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-[1rem] border-2 border-dashed border-border bg-background py-10 text-ink-faint transition-colors hover:border-primary/40 hover:bg-primary-light/30 hover:text-primary/60"
                >
                    <ImagePlus className="h-7 w-7" aria-hidden="true" />
                    <span className="text-sm font-medium">{t('upload')}</span>
                    <span className="text-xs">{t('formats')}</span>
                </button>
            )}
            <input
                ref={fileRef}
                type="file"
                accept={uploadAccept.images}
                className="sr-only"
                onChange={form.handleFile}
                disabled={!canUpload}
                aria-label={t('upload')}
            />
            {form.isCoverBusy && <p className="text-xs text-ink-muted">{t('uploadBusy')}</p>}
            {form.uploadError && <p className="text-xs text-rose-500">{form.uploadError}</p>}

            {/* Save */}
            <SettingsSaveButton canSave={form.canSave} isSaving={form.isSaving} errorMessage={form.errorMessage} />
        </form>
    );
}
