'use client';

import { useTranslations } from 'next-intl';

import { DemoGuestNotice } from '@/components/demo/DemoGuestNotice';
import { DemoQrJoinActions } from '@/components/demo/DemoQrJoinActions';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { QrLandingPromo } from '@/components/qrLanding/QrLandingPromo';
import { QrLandingScreen } from '@/components/qrLanding/QrLandingScreen';
import { useDemoQrLanding } from '@/hooks/useDemoQrLanding';
import type { DemoGuestPage } from '@/lib/demo/demoRouting';

// What a guest sees after scanning one of the demo event's codes: the same page as /q/{token}, with the
// demo notice on top and the plans in place of joining.
export function DemoQrScreen({ page }: { page: DemoGuestPage }) {
    const t = useTranslations('QrCodePage');
    const tDemo = useTranslations('Demo');
    const { landing, isUnavailable, noticeKey, plansHref, demoHref } = useDemoQrLanding(page);
    const resolution = landing.resolution;
    const isChooser = landing.view === 'chooser';

    return (
        <QrLandingState
            isLoading={landing.isLoading}
            terminalState={isUnavailable ? <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} /> : null}
            content={
                resolution ? (
                    <InviteLayout
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={resolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={resolution.eventSubtitle}
                        scroll="page"
                        topBar={<LanguageSwitcher variant="auth" />}
                        barTitle={isChooser ? 'heading' : 'line'}
                        bottom={isChooser ? <QrLandingPromo /> : null}
                    >
                        {/* Choices or form, with the demo notice */}
                        <QrLandingScreen
                            landing={landing}
                            notice={noticeKey ? <DemoGuestNotice>{tDemo(noticeKey)}</DemoGuestNotice> : null}
                            joinActions={<DemoQrJoinActions plansHref={plansHref} demoHref={demoHref} />}
                        />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
