'use client';

import { BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

// Every vendor's way from one event to their page across all events.
export function BusinessLinkSection() {
    const t = useTranslations('Vendors.me');

    return (
        <AppLink href={routes.business} className={cn(VENDOR_SECTION_SURFACE, 'flex min-h-14 items-center gap-3 p-4 sm:p-5')}>
            <BriefcaseBusiness className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 text-base font-semibold text-ink">{t('myBusiness')}</span>
            <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </AppLink>
    );
}
