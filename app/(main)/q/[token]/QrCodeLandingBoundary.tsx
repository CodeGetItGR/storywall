'use client';

import { useTranslations } from 'next-intl';

import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { QrLandingState } from '@/components/invite/QrLandingState';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { QrLandingPromo } from '@/components/qrLanding/QrLandingPromo';
import { QrLandingScreen } from '@/components/qrLanding/QrLandingScreen';
import { useQrLanding } from '@/hooks/useQrLanding';
import { getQrTerminalCopyKey } from '@/lib/qrLinks';

export default function QrCodeLandingBoundary({ token }: { token: string }) {
    const t = useTranslations('QrCodePage');
    const landing = useQrLanding(token);
    const { resolution, error } = landing;

    function renderTerminalState() {
        if (error || !resolution || resolution.status !== 'ACTIVE') {
            const copyKey = getQrTerminalCopyKey(resolution, error);
            return <InviteTerminalState title={t(`${copyKey}.title`)} description={t(`${copyKey}.description`)} />;
        }

        // An active code with nothing to offer this visitor: a join link without its invitation, a guest code with no actions.
        if (landing.plan.choices.length === 0) {
            return <InviteTerminalState title={t('unavailable.title')} description={t('unavailable.description')} />;
        }

        return null;
    }

    const terminalState = landing.isLoading ? null : renderTerminalState();
    const activeResolution = !terminalState && landing.view && resolution?.status === 'ACTIVE' ? resolution : null;
    // The choices show the cover inside the join card's preview (KAN-213), so the page opens on a slim bar with the logo.
    const isChooser = landing.view === 'chooser';

    return (
        <QrLandingState
            isLoading={landing.isLoading}
            terminalState={terminalState}
            content={
                activeResolution ? (
                    <InviteLayout
                        coverImageAlt={t('defaultHeroImageAlt')}
                        eventTitle={activeResolution.eventTitle ?? t('fallbackTitle')}
                        eventSubtitle={activeResolution.eventSubtitle}
                        scroll="page"
                        topBar={<LanguageSwitcher variant="auth" />}
                        barTitle={isChooser ? 'heading' : 'line'}
                        bottom={isChooser ? <QrLandingPromo /> : null}
                    >
                        <QrLandingScreen landing={landing} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
