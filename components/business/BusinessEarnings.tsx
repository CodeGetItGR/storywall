'use client';

import { useTranslations } from 'next-intl';

import { BusinessNotice } from '@/components/business/BusinessNotice';
import { PartnerBalances } from '@/components/partners/PartnerBalances';
import { PartnerTierProgress } from '@/components/partners/PartnerTierProgress';
import { Button } from '@/components/ui/button';
import { useResendVerificationEmail } from '@/hooks/useResendVerificationEmail';
import type { BusinessEarnings as Earnings } from '@/lib/business';
import { cn } from '@/lib/utils';

const FRAME = 'relative mt-7 border-t border-border pt-6';

// The partner's email isn't verified: say so and offer the confirmation email again.
function NotVerified() {
    const t = useTranslations('BusinessPage.earnings');
    const tResend = useTranslations('EmailVerificationBanner');
    const { state, resend } = useResendVerificationEmail();
    const message = state === 'sent' ? tResend('resendSent') : state === 'error' ? tResend('resendError') : t('notVerified');

    return (
        <BusinessNotice
            message={message}
            action={
                state !== 'sent' && (
                    <Button type="button" variant="outline" size="sm" onClick={resend} disabled={state === 'pending'} className="rounded-full">
                        {state === 'pending' ? tResend('resendPending') : tResend('resend')}
                    </Button>
                )
            }
        />
    );
}

// The top card's money part for partners: what is owed and the commission, or why it can't be shown.
// Nothing for non-partners or while it loads.
export function BusinessEarnings({
    earnings,
    onRetryAction,
    onContactAction,
}: {
    earnings: Earnings;
    onRetryAction: () => void;
    onContactAction: () => void;
}) {
    const t = useTranslations('BusinessPage.earnings');

    if (earnings.state === 'hidden' || earnings.state === 'loading') return null;

    if (earnings.state === 'ready') {
        const { balances, tierProgress } = earnings;
        return (
            <div className={cn(FRAME, 'grid gap-7', tierProgress && 'sm:grid-cols-2 sm:gap-0')}>
                {/* Balances */}
                <div className={cn(tierProgress && 'sm:pr-8')}>
                    <PartnerBalances balances={balances} />
                </div>

                {/* Commission */}
                {tierProgress && <PartnerTierProgress progress={tierProgress} className="sm:border-l sm:border-border sm:pl-8" />}
            </div>
        );
    }

    return (
        <div className={FRAME}>
            {earnings.state === 'notVerified' ? (
                /* Not verified */
                <NotVerified />
            ) : earnings.state === 'notLinked' ? (
                /* Not linked */
                <BusinessNotice
                    message={t('notLinked')}
                    action={
                        <Button type="button" variant="outline" size="sm" onClick={onContactAction} className="rounded-full">
                            {t('contact')}
                        </Button>
                    }
                />
            ) : (
                /* Failed */
                <BusinessNotice
                    message={t('failed')}
                    action={
                        <Button type="button" variant="outline" size="sm" onClick={onRetryAction} className="rounded-full">
                            {t('retry')}
                        </Button>
                    }
                />
            )}
        </div>
    );
}
