'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';
import type { useQrLanding } from '@/hooks/useQrLanding';

const EYEBROW_CLASS = 'mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase';

// The body of a scanned event code's page: the choices, or the form one of them opened.
export function QrLandingScreen({ landing }: { landing: ReturnType<typeof useQrLanding> }) {
    const t = useTranslations('QrCodePage');

    return (
        <>
            {/* Back */}
            {landing.canGoBack ? (
                <button
                    type="button"
                    onClick={landing.back}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('guestCode.back')}
                </button>
            ) : null}

            {/* Choices */}
            {landing.view === 'chooser' ? <QrLandingChoices plan={landing.plan} eventId={landing.eventId} onChoose={landing.choose} /> : null}

            {/* Upload */}
            {landing.view === 'upload' && landing.uploadToken ? (
                <>
                    <div className={EYEBROW_CLASS}>{t('mediaUploadEyebrow')}</div>
                    <AnonymousQrMediaUploadForm token={landing.uploadToken} member={landing.member} />
                </>
            ) : null}

            {/* Wish */}
            {landing.view === 'wish' && landing.wishToken ? (
                <>
                    <div className={EYEBROW_CLASS}>{t('guestCode.wishEyebrow')}</div>
                    <GuestWishForm token={landing.wishToken} />
                </>
            ) : null}
        </>
    );
}
