'use client';

import { useTranslations } from 'next-intl';

import { CookieSwitchRow } from '@/components/consent/CookieSwitchRow';

// The vendor's own opt-out. CookieSwitchRow is the app's one labelled switch row; it is not cookie-specific.
export function VendorListingSection({
    listed,
    hiddenByHost,
    disabled,
    error,
    onToggleAction,
}: {
    listed: boolean;
    hiddenByHost: boolean;
    disabled: boolean;
    error: string | null;
    onToggleAction: () => void;
}) {
    const t = useTranslations('Vendors');

    return (
        <section>
            {/* Switch: its label names the section */}
            <CookieSwitchRow
                label={t('me.listingSwitch')}
                description={hiddenByHost ? t('me.listingHiddenByHost') : ''}
                checked={listed}
                disabled={disabled}
                onCheckedChange={onToggleAction}
            />
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
