'use client';

import { Handshake, MailWarning } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';
import { useResendVerificationEmail } from '@/hooks/useResendVerificationEmail';
import type { PartnerPortalBlock } from '@/lib/partnerPortal';
import { routes } from '@/lib/routes';

function NotVerified() {
    const t = useTranslations('PartnerPortalPage.notVerified');
    const tResend = useTranslations('EmailVerificationBanner');
    const { state, resend } = useResendVerificationEmail();
    const description = state === 'sent' ? tResend('resendSent') : state === 'error' ? tResend('resendError') : t('description');

    return (
        <PageErrorState
            title={t('title')}
            description={description}
            icon={<MailWarning className="h-7 w-7" aria-hidden="true" />}
            onRetryAction={state === 'sent' || state === 'pending' ? undefined : resend}
            retryLabel={tResend('resend')}
        />
    );
}

function NotLinked() {
    const t = useTranslations('PartnerPortalPage.notLinked');

    return (
        <PageErrorState
            title={t('title')}
            description={t('description')}
            icon={<Handshake className="h-7 w-7" aria-hidden="true" />}
            actionHref={routes.contact}
            actionLabel={t('contact')}
        />
    );
}

// The signed-in account can't open the partner page: unverified, or not a partner.
export function PartnerPortalBlocked({ block }: { block: PartnerPortalBlock }) {
    return block === 'notVerified' ? <NotVerified /> : <NotLinked />;
}
