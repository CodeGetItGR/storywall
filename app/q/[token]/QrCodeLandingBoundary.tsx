'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { useMediaItem } from '@/hooks/useMedia';
import { useQrLinkResolution } from '@/hooks/useQrLinks';
import { getQrTerminalCopyKey } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export default function QrCodeLandingBoundary({ token }: { token: string }) {
    const t = useTranslations('QrCodePage');
    const router = useRouter();

    const { data: resolution, isLoading, error } = useQrLinkResolution(token);
    const { data: coverMedia } = useMediaItem(resolution?.status === 'ACTIVE' ? (resolution.coverMediaId ?? null) : null);

    const isRedirectingToInvite = resolution?.status === 'ACTIVE' && resolution.targetType === 'INVITATION';
    const isRedirectingToRegister = resolution?.status === 'ACTIVE' && resolution.targetType === 'EVENT_JOIN';

    useEffect(() => {
        if (resolution?.status !== 'ACTIVE') return;

        if (resolution.targetType === 'INVITATION' && resolution.inviteToken) {
            router.replace(routes.inviteToken(resolution.inviteToken));
            return;
        }

        if (resolution.targetType === 'EVENT_JOIN' && resolution.inviteToken) {
            router.replace(routes.auth.register({ invite: resolution.inviteToken }));
        }
    }, [resolution, router]);

    function renderTerminalState() {
        if (error || !resolution || resolution.status !== 'ACTIVE') {
            const copyKey = getQrTerminalCopyKey(resolution, error);
            return <InviteTerminalState title={t(`${copyKey}.title`)} description={t(`${copyKey}.description`)} />;
        }

        if ((resolution.targetType === 'EVENT_JOIN' || resolution.targetType === 'INVITATION') && !resolution.inviteToken) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        return null;
    }

    const terminalState = renderTerminalState();
    const isRedirecting = isRedirectingToInvite || isRedirectingToRegister;
    const isMediaUpload = !terminalState && !isRedirecting && resolution?.status === 'ACTIVE' && resolution.targetType === 'MEDIA_UPLOAD';

    return (
        <QrLandingState
            isLoading={isLoading || isRedirecting}
            terminalState={terminalState}
            content={
                isMediaUpload ? (
                    <InviteLayout
                        coverImageSrc={coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={resolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={resolution.eventSubtitle}
                    >
                        <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            {t('mediaUploadEyebrow')}
                        </div>
                        <AnonymousQrMediaUploadForm token={token} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
