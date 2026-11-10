'use client';

import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { cookieBannerClassName } from '@/lib/cookieBanner';
import { routes } from '@/lib/routes';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

// Accept and Reject carry the same weight on purpose: refusing must be as easy
// as agreeing.
const ACTION =
    'inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold focus-ring transition-opacity hover:opacity-85';

export function CookieBanner() {
    const t = useTranslations('CookieConsent');
    const { consent, acceptAll, rejectAll, openSettings } = useCookieConsent();
    const className = cookieBannerClassName(useCreateWizardEnabled());

    // undefined: not read yet. A saved choice: nothing to ask.
    if (consent !== null) return null;

    return (
        <section aria-label={t('bannerLabel')} className={className}>
            {/* Message */}
            <p className="text-sm leading-relaxed text-ink-muted">
                {t('message')}{' '}
                <AppLink className="font-semibold text-ink underline underline-offset-2" href={routes.legal.cookies()}>
                    {t('policyLink')}
                </AppLink>
            </p>
            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
                <button className={`${ACTION} bg-ink text-white`} onClick={rejectAll} type="button">
                    {t('rejectAll')}
                </button>
                <button className={`${ACTION} bg-ink text-white`} onClick={acceptAll} type="button">
                    {t('acceptAll')}
                </button>
                <button className={`${ACTION} basis-full bg-surface-muted text-ink sm:basis-auto`} onClick={openSettings} type="button">
                    {t('settings')}
                </button>
            </div>
        </section>
    );
}
