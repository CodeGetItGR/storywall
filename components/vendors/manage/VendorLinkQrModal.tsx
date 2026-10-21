'use client';

import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { Modal } from '@/components/ui/modal';
import type { VendorLinkDto } from '@/lib/api/types';
import { vendorInviteUrl } from '@/lib/vendors';

// The printed code stays language-neutral, like the event's QR links.
export function VendorLinkQrModal({ link, onCloseAction }: { link: VendorLinkDto | null; onCloseAction: () => void }) {
    const t = useTranslations('Vendors');
    const title = link ? t('manage.qrTitle', { type: t(`types.${link.vendorType}`) }) : '';

    return (
        <Modal open={link !== null} onClose={onCloseAction} size="sm" closeLabel={t('manage.close')}>
            {link && (
                <Modal.Body className="p-6">
                    {/* Title */}
                    <h2 className="mb-6 pr-8 text-lg font-bold text-ink">{title}</h2>

                    {/* Code */}
                    <div className="flex justify-center rounded-2xl bg-white p-5">
                        <QRCodeSVG
                            value={vendorInviteUrl(link.inviteToken)}
                            size={240}
                            level="H"
                            marginSize={4}
                            fgColor="#241f1a"
                            bgColor="#ffffff"
                            title={title}
                            imageSettings={{ src: '/assets/Logo.svg', height: 40, width: 40, excavate: true }}
                        />
                    </div>
                </Modal.Body>
            )}
        </Modal>
    );
}
