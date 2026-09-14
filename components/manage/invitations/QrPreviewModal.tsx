'use client';

import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import type { QrLinkResponseDto } from '@/lib/api/types';

import { QrCodeCard } from './QrCodeCard';

export function QrPreviewModal({ qrLink, open, onCloseAction }: { qrLink: QrLinkResponseDto; open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('ManagePage');
    const tGlobal = useTranslations();

    return (
        <Modal open={open} onClose={onCloseAction} closeLabel={t('invitations.create.cancel')} size="sm">
            <Modal.Body className="p-6">
                <div className="mb-6 pr-8">
                    <p className="text-lg font-bold text-ink">{qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || t('qr.untitled')}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t(`qr.targetTypes.${qrLink.targetType}`)}</p>
                </div>

                <QrCodeCard qrLink={qrLink} />
            </Modal.Body>
        </Modal>
    );
}
