'use client';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField } from '@/components/admin/AdminField';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { EVENT_TYPE_IMAGE_ACCEPT, type EventTypeCardImage } from '@/hooks/useEventTypeCardImage';

export function EventTypeImageField({ image }: { image: EventTypeCardImage }) {
    const t = useTranslations('AdminPage');
    const describeError = useApiErrorMessage();
    const isBusy = image.isUploading || image.isRemoving;

    return (
        <>
            {/* Card image */}
            <AdminField label={t('eventTypes.image')} hint={t('eventTypes.imageHint')}>
                <div className="space-y-3">
                    {image.imageUrl && (
                        <div className="relative aspect-video w-full max-w-80 overflow-hidden rounded-md border border-border bg-canvas">
                            <ProtectedImage src={image.imageUrl} alt="" fill sizes="320px" className="object-cover" />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas has-disabled:cursor-not-allowed has-disabled:opacity-50">
                            {image.isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                            )}
                            {image.imageUrl ? t('eventTypes.imageReplace') : t('eventTypes.imageChoose')}
                            <input
                                type="file"
                                accept={EVENT_TYPE_IMAGE_ACCEPT}
                                onChange={image.handleFileChange}
                                disabled={isBusy}
                                className="sr-only"
                            />
                        </label>
                        {image.imageUrl && (
                            <button
                                type="button"
                                onClick={image.openRemove}
                                disabled={isBusy}
                                className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-wash disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('eventTypes.imageRemove')}
                            </button>
                        )}
                    </div>
                    {image.error && <p className="text-sm text-status-danger">{describeError(image.error)}</p>}
                </div>
            </AdminField>

            <ConfirmActionModal
                open={image.confirmingRemove}
                onCloseAction={image.closeRemove}
                title={t('eventTypes.imageRemoveTitle')}
                body={t('eventTypes.imageRemoveBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('eventTypes.imageRemove')}
                isConfirming={image.isRemoving}
                onConfirmAction={image.confirmRemove}
            />
        </>
    );
}
