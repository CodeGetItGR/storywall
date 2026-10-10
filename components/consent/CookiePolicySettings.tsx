'use client';

import { CookieSettingsLink } from '@/components/consent/CookieSettingsLink';
import { CookieSettingsSheet } from '@/components/consent/CookieSettingsSheet';

// On the Cookie Policy page: change or withdraw the choice made on the landing page.
export function CookiePolicySettings() {
    return (
        <div className="mt-8">
            <CookieSettingsLink className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:opacity-85" />
            <CookieSettingsSheet />
        </div>
    );
}
