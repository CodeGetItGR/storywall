'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';
import type { useQrLanding } from '@/hooks/useQrLanding';

// The body of a scanned event code's page: the choices, or the form one of them opened.
export function QrLandingScreen({ landing }: { landing: ReturnType<typeof useQrLanding> }) {
    const t = useTranslations('QrCodePage');
    const label = landing.view === 'upload' ? t('mediaUploadEyebrow') : landing.view === 'wish' ? t('guestCode.wishEyebrow') : null;

    return (
        <>
            {/* Header: back arrow at the left, the form's label centred. Hidden on the sent screen. */}
            {label && !landing.isSent ? (
                <div className="relative mb-4 flex min-h-9 items-center justify-center">
                    {landing.canGoBack ? (
                        <button
                            type="button"
                            onClick={landing.back}
                            aria-label={t('guestCode.back')}
                            className="absolute left-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-ink transition-opacity hover:opacity-80"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                    ) : null}
                    <div className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</div>
                </div>
            ) : null}

            {/* Choices */}
            {landing.view === 'chooser' ? <QrLandingChoices plan={landing.plan} eventId={landing.eventId} onChoose={landing.choose} /> : null}

            {/* Upload */}
            {landing.view === 'upload' && landing.uploadToken ? (
                <AnonymousQrMediaUploadForm token={landing.uploadToken} member={landing.member} onSentChange={landing.setIsSent} />
            ) : null}

            {/* Wish */}
            {landing.view === 'wish' && landing.wishToken ? <GuestWishForm token={landing.wishToken} onSentChange={landing.setIsSent} /> : null}
        </>
    );
}
