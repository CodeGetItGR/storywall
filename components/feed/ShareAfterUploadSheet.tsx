'use client';

import { MoreHorizontal, Share } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FaFacebook, FaInstagram } from 'react-icons/fa6';

import { QrSentArt } from '@/components/qrGuest/QrSentArt';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface ShareAfterUploadSheetProps {
    open: boolean;
    onShareAction: () => void;
    onDeclineAction: () => void;
}

// Opens once a guest's post or story is up: one tap to the phone's share menu, files already loaded.
export function ShareAfterUploadSheet({ open, onShareAction, onDeclineAction }: ShareAfterUploadSheetProps) {
    const t = useTranslations('PublishQueue');

    return (
        <Modal open={open} onClose={onDeclineAction} variant="sheet" size="sm" ariaLabel={t('shareSheetTitle')} showCloseButton={false}>
            <Modal.Body className="flex flex-col items-center px-5 pt-6 pb-6 text-center">
                {/* Illustration */}
                <QrSentArt kind="upload" />

                {/* Message */}
                <h2 className="mt-3 text-lg font-bold text-ink">{t('shareSheetTitle')}</h2>
                <p className="mt-1 max-w-xs text-sm text-ink-muted">{t('shareSheetBody')}</p>

                {/* Where it can go (named in the line above) */}
                <div className="mt-4 flex items-center gap-4" aria-hidden="true">
                    <FaInstagram className="size-6 text-[#E1306C]" />
                    <FaFacebook className="size-6 text-[#1877F2]" />
                    <MoreHorizontal className="size-6 text-ink-muted" />
                </div>

                {/* Actions */}
                <div className="mt-6 flex w-full flex-col gap-2">
                    <Button type="button" size="lg" className="h-12 w-full rounded-full text-base" onClick={onShareAction}>
                        <Share aria-hidden="true" />
                        {t('share')}
                    </Button>
                    <Button type="button" variant="ghost" size="lg" className="h-11 w-full rounded-full text-ink-muted" onClick={onDeclineAction}>
                        {t('notNow')}
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
