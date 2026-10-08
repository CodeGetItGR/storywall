'use client';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField } from '@/components/admin/AdminField';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { PartnerBrandingImageKind } from '@/hooks/useAdminPartnerBranding';
import { BRANDING_IMAGE_ACCEPT, useCollaboratorBrandingImage } from '@/hooks/useCollaboratorBranding';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function CollaboratorBrandingImageField({ collaborator, kind }: { collaborator: CollaboratorResponseDto; kind: PartnerBrandingImageKind }) {
    const t = useTranslations('AdminPage.collaborations.feedCard');
    const tAdmin = useTranslations('AdminPage');
    const image = useCollaboratorBrandingImage(collaborator, kind);
    const isBusy = image.isUploading || image.isRemoving;

    return (
        <>
            {/* Image */}
            <AdminField label={t(`fields.${kind}`)} hint={image.imageUrl && !image.canRemove ? t('images.lockedHint') : undefined}>
                <div className="space-y-3">
                    {image.imageUrl && (
                        <div
                            className={cn(
                                'relative overflow-hidden rounded-md border border-border bg-canvas',
                                kind === 'logo' ? 'h-20 w-20' : 'aspect-video w-full max-w-80',
                            )}
                        >
                            <ProtectedImage
                                src={image.imageUrl}
                                alt=""
                                fill
                                sizes="320px"
                                className={kind === 'logo' ? 'object-contain' : 'object-cover'}
                            />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas has-disabled:cursor-not-allowed has-disabled:opacity-50">
                            {image.isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                            )}
                            {image.imageUrl ? t('images.replace') : t('images.choose')}
                            <input
                                type="file"
                                accept={BRANDING_IMAGE_ACCEPT}
                                onChange={image.handleFileChange}
                                disabled={isBusy}
                                className="sr-only"
                            />
                        </label>
                        {image.imageUrl && image.canRemove && (
                            <button
                                type="button"
                                onClick={image.openRemove}
                                disabled={isBusy}
                                className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-status-danger hover:bg-status-danger-wash disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('images.remove')}
                            </button>
                        )}
                    </div>
                    {image.error && !image.confirmingRemove && (
                        <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(image.error)}`)}</p>
                    )}
                </div>
            </AdminField>

            <ConfirmActionModal
                open={image.confirmingRemove}
                onCloseAction={image.closeRemove}
                title={t(`images.removeTitle.${kind}`)}
                body={
                    <>
                        {t('images.removeBody')}
                        {image.error && (
                            <span className="mt-2 block text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(image.error)}`)}</span>
                        )}
                    </>
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('images.remove')}
                isConfirming={image.isRemoving}
                onConfirmAction={image.confirmRemove}
            />
        </>
    );
}
