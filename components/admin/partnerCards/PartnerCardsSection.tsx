'use client';

import { useTranslations } from 'next-intl';

import { PartnerCardEventLookup } from '@/components/admin/partnerCards/PartnerCardEventLookup';
import { PartnerCardsReport } from '@/components/admin/partnerCards/PartnerCardsReport';

export function PartnerCardsSection() {
    const t = useTranslations('AdminPage.partnerCards');

    return (
        <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            <section className="space-y-8">
                {/* Page heading */}
                <header className="border-b border-border pb-5">
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
                </header>

                {/* Event link */}
                <PartnerCardEventLookup />

                {/* Report */}
                <PartnerCardsReport />
            </section>
        </div>
    );
}
