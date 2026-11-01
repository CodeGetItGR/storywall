'use client';

import { Pencil, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { PartnerRole } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import type { ProfileLoadState } from '@/lib/vendors';

// Who the business is, with Edit once their details have loaded (a retry if they failed), and for partners the
// earnings passed in as children.
export function BusinessHero({
    name,
    logoUrl,
    vendorType,
    partner,
    profileState,
    onEditAction,
    onRetryProfileAction,
    children,
}: {
    name: string | null;
    logoUrl: string | null;
    vendorType: PartnerRole | null;
    partner: boolean;
    profileState: ProfileLoadState;
    onEditAction: () => void;
    onRetryProfileAction: () => void;
    children?: ReactNode;
}) {
    const t = useTranslations('BusinessPage');
    const tVendors = useTranslations('Vendors');
    const displayName = name ?? t('unnamed');

    return (
        <section aria-labelledby="business-name" className={cn(VENDOR_SECTION_SURFACE, 'relative overflow-hidden p-5 sm:p-7 lg:col-span-2')}>
            {/* Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />

            {/* Identity */}
            <div className="relative flex items-center gap-3.5">
                <VendorLogo logoUrl={logoUrl} name={displayName} className="size-12" />
                <div className="min-w-0 flex-1">
                    <h2 id="business-name" className="truncate text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl">
                        {displayName}
                    </h2>
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                        {vendorType && <span>{tVendors(`types.${vendorType}`)}</span>}
                        {partner && (
                            <span className="rounded-full bg-status-good-wash px-2 py-0.5 text-xs font-semibold text-status-good">
                                {t('partnerPill')}
                            </span>
                        )}
                    </p>
                </div>

                {/* Edit, or retry when the details failed to load */}
                {profileState === 'failed' ? (
                    <Button type="button" variant="outline" onClick={onRetryProfileAction} className="shrink-0 gap-2 rounded-full px-3">
                        <RefreshCw className="size-4" aria-hidden="true" />
                        {t('retryProfile')}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onEditAction}
                        disabled={profileState === 'loading'}
                        className="shrink-0 gap-2 rounded-full px-3"
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                        {t('edit')}
                    </Button>
                )}
            </div>

            {/* Earnings */}
            {children}
        </section>
    );
}
