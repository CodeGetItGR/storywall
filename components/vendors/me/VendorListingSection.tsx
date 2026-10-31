'use client';

import { useTranslations } from 'next-intl';

import { CookieSwitchRow } from '@/components/consent/CookieSwitchRow';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// The vendor's own opt-out, on the same surface as the page's other sections. The switch label names the section.
// CookieSwitchRow is the app's one labelled switch row; it is not cookie-specific.
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
        <section className={cn(VENDOR_SECTION_SURFACE, 'px-4 py-1 sm:px-5')}>
            {/* Switch */}
            <CookieSwitchRow
                label={t('me.listingSwitch')}
                description={hiddenByHost ? t('me.listingHiddenByHost') : t('hints.listing')}
                checked={listed}
                disabled={disabled}
                onCheckedChange={onToggleAction}
            />
            {error && (
                <p role="alert" className="pb-3 text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
