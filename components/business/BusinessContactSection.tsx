'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';

// One row that opens "Write to us".
export function BusinessContactSection({ onOpenAction }: { onOpenAction: () => void }) {
    const t = useTranslations('BusinessPage.contact');

    return (
        <section aria-label={t('title')} className={VENDOR_SECTION_SURFACE}>
            <button type="button" onClick={onOpenAction} className="flex w-full items-center gap-3 rounded-[1.75rem] p-4 text-left focus-ring sm:p-5">
                <BusinessSectionIcon section="contact" />
                <span className="flex-1 text-base font-semibold text-ink">{t('title')}</span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </button>
        </section>
    );
}
