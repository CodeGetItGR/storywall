'use client';

import { useTranslations } from 'next-intl';

import { DemoGuestNotice } from '@/components/demo/DemoGuestNotice';
import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { useDemoQrUpload } from '@/hooks/useDemoQrUpload';

// What a guest sees after scanning the gallery upload code, inside the demo. Same form as /q/{token}.
export function DemoUploadScreen() {
    const t = useTranslations('QrCodePage');
    const tDemo = useTranslations('Demo');
    const { event, isLoading, token } = useDemoQrUpload();

    return (
        <QrLandingState
            isLoading={isLoading}
            terminalState={
                !event || !token ? <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} /> : null
            }
            content={
                event && token ? (
                    <InviteLayout
                        coverImageSrc={event.coverMedia?.mediaUrl}
                        coverImageAlt={t('defaultHeroImageAlt')}
                        theme={event.theme}
                        eventTitle={event.title}
                        eventSubtitle={event.subtitle}
                    >
                        {/* Demo notice */}
                        <DemoGuestNotice>{tDemo('uploadNotice')}</DemoGuestNotice>

                        {/* Upload form */}
                        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                            {t('mediaUploadEyebrow')}
                        </div>
                        <AnonymousQrMediaUploadForm token={token} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
