'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PartnerBalances } from '@/components/partners/PartnerBalances';
import { PartnerTierProgress } from '@/components/partners/PartnerTierProgress';
import { Button } from '@/components/ui/button';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { PartnerRole, PartnerTierProgressDto, VendorProfileDto } from '@/lib/api/types';
import type { PartnerBalance } from '@/lib/partnerPortal';
import { cn } from '@/lib/utils';

// Who the business is, and for partners what they are owed and their commission.
export function BusinessHero({
    profile,
    vendorType,
    partner,
    balances,
    tierProgress,
    onEditAction,
}: {
    profile: VendorProfileDto | null;
    vendorType: PartnerRole | null;
    partner: boolean;
    balances: PartnerBalance[] | null;
    tierProgress: PartnerTierProgressDto | null;
    onEditAction: () => void;
}) {
    const t = useTranslations('BusinessPage');
    const tVendors = useTranslations('Vendors');
    const name = profile?.businessName ?? t('unnamed');

    return (
        <section aria-labelledby="business-name" className={cn(VENDOR_SECTION_SURFACE, 'relative overflow-hidden p-5 sm:p-7 lg:col-span-2')}>
            {/* Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />

            {/* Identity */}
            <div className="relative flex items-center gap-3.5">
                <VendorLogo logoUrl={profile?.logoUrl ?? null} name={name} className="size-12" />
                <div className="min-w-0 flex-1">
                    <h2 id="business-name" className="truncate text-xl leading-tight font-bold tracking-tight text-ink sm:text-2xl">
                        {name}
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
                <Button type="button" variant="outline" onClick={onEditAction} className="shrink-0 gap-2 rounded-full px-3">
                    <Pencil className="size-4" aria-hidden="true" />
                    {t('edit')}
                </Button>
            </div>

            {/* Earnings */}
            {partner && balances && (
                <div className={cn('relative mt-7 grid gap-7 border-t border-border pt-6', tierProgress && 'sm:grid-cols-2 sm:gap-0')}>
                    <div className={cn(tierProgress && 'sm:pr-8')}>
                        <PartnerBalances balances={balances} />
                    </div>
                    {tierProgress && <PartnerTierProgress progress={tierProgress} className="sm:border-l sm:border-border sm:pl-8" />}
                </div>
            )}
        </section>
    );
}
