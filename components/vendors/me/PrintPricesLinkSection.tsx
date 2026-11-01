'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { routes } from '@/lib/routes';

// Print prices are set once for every event on the business page; this event keeps only its included prints.
export function PrintPricesLinkSection({ includedRow }: { includedRow?: ReactNode }) {
    const t = useTranslations('Vendors.me.printPrices');

    return (
        <VendorMeSection id="vendor-print-prices-title" title={t('title')}>
            {/* Link */}
            <AppLink href={`${routes.business}#print-prices`} className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-ink">
                {t('openBusiness')}
                <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            </AppLink>

            {/* Included prints */}
            {includedRow}
        </VendorMeSection>
    );
}
