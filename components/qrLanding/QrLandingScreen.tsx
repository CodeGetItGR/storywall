'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { GuestWishForm } from '@/components/qrGuest/GuestWishForm';
import { QrIntroOverlay } from '@/components/qrLanding/QrIntroOverlay';
import { QrLandingChoices } from '@/components/qrLanding/QrLandingChoices';
import { useQrEventDetails } from '@/hooks/useQrEventDetails';
import { useQrIntro } from '@/hooks/useQrIntro';
import type { useQrLanding } from '@/hooks/useQrLanding';
import { useQrViewScroll } from '@/hooks/useQrViewScroll';
import { showsQrIntro } from '@/lib/qrLanding';

interface QrLandingScreenProps {
    landing: ReturnType<typeof useQrLanding>;
    // The demo's: buttons in place of the join card's own, and a note above the choices or the form.
    joinActions?: ReactNode;
    notice?: ReactNode;
}

// The body of a scanned event code's page: the choices, or the form one of them opened.
export function QrLandingScreen({ landing, joinActions, notice }: QrLandingScreenProps) {
    const t = useTranslations('QrCodePage');
    const details = useQrEventDetails(landing.view === 'chooser' ? landing.plan.joinInviteToken : null);
    const { ref: scrollRef, choose } = useQrViewScroll(landing.view, landing.choose);
    const intro = useQrIntro(landing.view === 'chooser' && showsQrIntro(landing.plan.choices));
    const label = landing.view === 'upload' ? t('mediaUploadEyebrow') : landing.view === 'wish' ? t('guestCode.wishEyebrow') : null;

    return (
        <div ref={scrollRef}>
            {/* Notice: on the choices it sits under the event's details */}
            {landing.view !== 'chooser' && notice ? <div className="mb-5">{notice}</div> : null}

            {/* Header: back arrow at the left, the form's title centred. Hidden on the sent screen. */}
            {label && !landing.isSent ? (
                <div className="relative mb-6 flex min-h-11 items-center justify-center px-12">
                    {landing.canGoBack ? (
                        <button
                            type="button"
                            onClick={landing.back}
                            aria-label={t('guestCode.back')}
                            className="absolute left-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink transition-opacity hover:opacity-80"
                        >
                            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                    ) : null}
                    <h2 className="text-center text-[17px] font-semibold text-ink">{label}</h2>
                </div>
            ) : null}

            {/* Choices */}
            {landing.view === 'chooser' ? (
                <QrLandingChoices
                    plan={landing.plan}
                    eventId={landing.eventId}
                    onChoose={choose}
                    coverSrc={landing.resolution?.coverMedia?.mediaUrl ?? null}
                    eventTitle={landing.resolution?.eventTitle ?? t('fallbackTitle')}
                    isSignedIn={landing.isSignedIn}
                    details={details}
                    joinActions={joinActions}
                    notice={notice}
                />
            ) : null}

            {/* Intro */}
            {intro.isOpen ? <QrIntroOverlay isLeaving={intro.isLeaving} progressStarted={intro.progressStarted} onDismiss={intro.dismiss} /> : null}

            {/* Upload */}
            {landing.view === 'upload' && landing.uploadToken ? (
                <AnonymousQrMediaUploadForm token={landing.uploadToken} member={landing.member} onSentChange={landing.setIsSent} />
            ) : null}

            {/* Wish */}
            {landing.view === 'wish' && landing.wishToken ? <GuestWishForm token={landing.wishToken} onSentChange={landing.setIsSent} /> : null}
        </div>
    );
}
