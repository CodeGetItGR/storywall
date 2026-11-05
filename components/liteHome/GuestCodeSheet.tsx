'use client';

import { useTranslations } from 'next-intl';

import { QrCodeCard } from '@/components/manage/invitations/QrCodeCard';
import { Modal } from '@/components/ui/modal';
import { useQrCardHref } from '@/hooks/useQrCardTemplates';
import type { QrLinkResponseDto } from '@/lib/api/types';

// A lite event's guest code in a sheet. QrCodeCard brings copy, download, print, share and the card designer.
export function GuestCodeSheet({
    open,
    eventId,
    guestLink,
    onCloseAction,
}: {
    open: boolean;
    eventId: string;
    guestLink: QrLinkResponseDto;
    onCloseAction: () => void;
}) {
    const t = useTranslations('LiteHome');
    const tFeed = useTranslations('FeedPage');
    const cardHref = useQrCardHref(eventId, guestLink.id);

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={tFeed('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-lg font-bold text-ink">{t('qrSheetTitle')}</h2>

                {/* Code */}
                <div className="mt-5">
                    <QrCodeCard qrLink={guestLink} size={240} cardHref={cardHref} />
                </div>
            </Modal.Body>
        </Modal>
    );
}
