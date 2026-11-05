'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { GuestCodeScreen } from '@/components/qrGuest/GuestCodeScreen';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { getQrRedirectPath, getQrTerminalCopyKey } from '@/lib/qrLinks';

export default function QrCodeLandingBoundary({ token }: { token: string }) {
    const t = useTranslations('QrCodePage');
    const router = useRouter();

    const { data: resolution, isLoading, error } = useQrLinkResolution(token);
    const coverMedia = resolution?.status === 'ACTIVE' ? (resolution.coverMedia ?? null) : null;

    const isRedirecting = resolution?.status === 'ACTIVE' && (resolution.targetType === 'INVITATION' || resolution.targetType === 'EVENT_JOIN');

    useEffect(() => {
        const redirectPath = getQrRedirectPath(resolution);
        if (redirectPath) router.replace(redirectPath);
    }, [resolution, router]);

    function renderTerminalState() {
        if (error || !resolution || resolution.status !== 'ACTIVE') {
            const copyKey = getQrTerminalCopyKey(resolution, error);
            return <InviteTerminalState title={t(`${copyKey}.title`)} description={t(`${copyKey}.description`)} />;
        }

        if ((resolution.targetType === 'EVENT_JOIN' || resolution.targetType === 'INVITATION') && !resolution.inviteToken) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        if (resolution.targetType === 'GUEST' && !resolution.guestActions?.length) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        return null;
    }

    const terminalState = renderTerminalState();
    const activeResolution = !terminalState && !isRedirecting && resolution?.status === 'ACTIVE' ? resolution : null;
    const isMediaUpload = activeResolution?.targetType === 'MEDIA_UPLOAD';
    const isGuestCode = activeResolution?.targetType === 'GUEST';

    return (
        <QrLandingState
            isLoading={isLoading || isRedirecting}
            terminalState={terminalState}
            content={
                activeResolution && (isMediaUpload || isGuestCode) ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        theme={activeResolution.theme}
                        eventTitle={activeResolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={activeResolution.eventSubtitle}
                        scroll="page"
                    >
                        {isMediaUpload ? (
                            <>
                                {/* Upload */}
                                <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                                    {t('mediaUploadEyebrow')}
                                </div>
                                <AnonymousQrMediaUploadForm token={token} />
                            </>
                        ) : (
                            // Guest code
                            <GuestCodeScreen token={token} actions={activeResolution.guestActions ?? []} />
                        )}
                    </InviteLayout>
                ) : null
            }
        />
    );
}
