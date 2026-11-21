import { useTranslations } from 'next-intl';

import { QR_JOIN_LINK_CLASS, QR_JOIN_PRIMARY_CLASS } from '@/components/qrLanding/QrJoinCard';
import { AppLink } from '@/components/ui/AppLink';

// The demo QR page's join card: nobody can join a demo event, so it points to the plans and back to the demo.
export function DemoQrJoinActions({ plansHref, demoHref }: { plansHref: string; demoHref: string | null }) {
    const t = useTranslations('Demo');

    return (
        <>
            {/* Plans */}
            <AppLink href={plansHref} className={QR_JOIN_PRIMARY_CLASS}>
                {t('seePlans')}
            </AppLink>

            {/* Back to the demo */}
            {demoHref && (
                <AppLink href={demoHref} className={QR_JOIN_LINK_CLASS}>
                    {t('backToDemo')}
                </AppLink>
            )}
        </>
    );
}
