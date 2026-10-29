'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { ProAlbumFilePicker } from '@/components/vendors/me/ProAlbumFilePicker';
import { ProAlbumItem } from '@/components/vendors/me/ProAlbumItem';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';
import { useProAlbum } from '@/hooks/useProAlbum';

export function ProAlbumSection({
    eventId,
    usedBytes,
    allowanceBytes,
    canUpload,
}: {
    eventId: string;
    usedBytes: number;
    allowanceBytes: number;
    canUpload: boolean;
}) {
    const t = useTranslations('Vendors');
    const album = useProAlbum(eventId);

    return (
        <VendorMeSection id="vendor-pro-title" title={t('me.proTitle')} hint={t('hints.proAlbum')}>
            {/* Meter */}
            <ProStorageMeter usedBytes={usedBytes} allowanceBytes={allowanceBytes} hideLabel />

            {/* Upload */}
            {canUpload && (
                <div className="flex flex-wrap items-center gap-2">
                    <ProAlbumFilePicker onChooseAction={album.chooseFiles} />
                    {album.selectedFiles.length > 0 && (
                        <Button type="button" size="lg" onClick={album.upload} disabled={album.isUploading}>
                            {t('me.proUpload', { count: album.selectedFiles.length })}
                        </Button>
                    )}
                </div>
            )}
            {album.notice && (
                <p role="status" className="text-sm text-ink-muted">
                    {album.notice}
                </p>
            )}

            {/* Items */}
            {!album.isLoading && album.items.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('me.proEmpty')}</p>
            ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {album.items.map((item) => (
                        <ProAlbumItem key={item.id} item={item} canDelete={canUpload} onDeleteAction={album.requestDelete} />
                    ))}
                </ul>
            )}
            {album.hasNextPage && (
                <Button type="button" variant="outline" size="lg" onClick={album.loadMore}>
                    {t('me.proMore')}
                </Button>
            )}

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={album.deleteTargetId !== null}
                title={t('me.proDeleteTitle')}
                body={t('me.proDeleteBody')}
                confirmLabel={t('me.proDeleteConfirm')}
                cancelLabel={t('me.proDeleteCancel')}
                onCloseAction={album.cancelDelete}
                onConfirmAction={album.confirmDelete}
                isConfirming={album.isDeleting}
            />
        </VendorMeSection>
    );
}
