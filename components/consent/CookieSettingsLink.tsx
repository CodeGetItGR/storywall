'use client';

import { useTranslations } from 'next-intl';

import { useCookieConsent } from '@/hooks/useCookieConsent';

// Reopens the cookie settings, so a choice can be changed or withdrawn at any
// time. Colour and size come from whichever surface hosts it.
export function CookieSettingsLink({ className = '' }: { className?: string }) {
    const t = useTranslations('CookieConsent');
    const { openSettings } = useCookieConsent();

    return (
        <button className={`cursor-pointer text-left focus-ring ${className}`} onClick={openSettings} type="button">
            {t('openSettings')}
        </button>
    );
}
