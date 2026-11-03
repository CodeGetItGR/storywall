'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { GuestCodeChooser } from '@/components/qrGuest/GuestCodeChooser';
import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { useGuestCodeScreen } from '@/hooks/useGuestCodeScreen';
import type { QrGuestAction } from '@/lib/api/types';

const EYEBROW_CLASS = 'mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase';

interface GuestCodeScreenProps {
    token: string;
    actions: QrGuestAction[];
}

export function GuestCodeScreen({ token, actions }: GuestCodeScreenProps) {
    const t = useTranslations('QrCodePage');
    const { view, open, back, canGoBack } = useGuestCodeScreen(actions);

    return (
        <>
            {/* Back */}
            {canGoBack ? (
                <button
                    type="button"
                    onClick={back}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('guestCode.back')}
                </button>
            ) : null}

            {/* Chooser */}
            {view === 'chooser' ? <GuestCodeChooser onChoose={open} /> : null}

            {/* Upload */}
            {view === 'upload' ? (
                <>
                    <div className={EYEBROW_CLASS}>{t('mediaUploadEyebrow')}</div>
                    <AnonymousQrMediaUploadForm token={token} />
                </>
            ) : null}

            {/* Wish */}
            {view === 'wish' ? (
                <>
                    <div className={EYEBROW_CLASS}>{t('guestCode.wishEyebrow')}</div>
                    <GuestWishForm token={token} />
                </>
            ) : null}
        </>
    );
}
