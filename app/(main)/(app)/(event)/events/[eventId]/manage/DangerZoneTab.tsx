'use client';

import { GalleryArchiveDownloadModal } from '@/components/gallery/GalleryArchiveDownloadModal';
import { EventDangerZone } from '@/components/manage/danger/EventDangerZone';
import { EventDeleteConfirmModal } from '@/components/manage/danger/EventDeleteConfirmModal';
import { useDangerZoneDownloads } from '@/hooks/useDangerZoneDownloads';
import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';
import type { EventDetailResponseDto } from '@/lib/api/types';

export default function DangerZoneTab({ event }: { event: EventDetailResponseDto }) {
    const deletionFlow = useEventDeletionFlow(event.id, { codeFirst: true });
    const downloads = useDangerZoneDownloads(event);

    return (
        <>
            {/* Danger zone */}
            <EventDangerZone
                showGalleryDownload={downloads.showGalleryDownload}
                wishbook={downloads.wishbook}
                onDownloadAllAction={downloads.openArchive}
                onDeleteAction={deletionFlow.startDeletion}
                isSendingCode={deletionFlow.isSendingCode}
                // A refused send (rate limit) waits out its cooldown before another try.
                disabled={deletionFlow.isDeleting || (deletionFlow.step === 'send' && deletionFlow.resendSeconds > 0)}
                error={deletionFlow.confirmOpen ? null : deletionFlow.deleteError}
            />

            {/* Code */}
            <EventDeleteConfirmModal
                variant="sheet"
                open={deletionFlow.confirmOpen}
                step={deletionFlow.step}
                otpCode={deletionFlow.otpCode}
                codeDigits={deletionFlow.codeDigits}
                onOtpChangeAction={deletionFlow.handleOtpChange}
                otpInvalid={deletionFlow.otpInvalid}
                deleteError={deletionFlow.deleteError}
                resendSeconds={deletionFlow.resendSeconds}
                isSendingCode={deletionFlow.isSendingCode}
                isDeleting={deletionFlow.isDeleting}
                onCloseAction={deletionFlow.closeConfirm}
                onSendCodeAction={deletionFlow.sendOtp}
                onConfirmAction={deletionFlow.confirmDelete}
            />

            {/* Download all */}
            {downloads.showGalleryDownload && (
                <GalleryArchiveDownloadModal eventId={event.id} open={downloads.archiveOpen} onClose={downloads.closeArchive} />
            )}
        </>
    );
}
