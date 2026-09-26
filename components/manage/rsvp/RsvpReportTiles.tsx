'use client';

import { useTranslations } from 'next-intl';

import { MetricStrip } from '@/components/ui/MetricStrip';
import type { RsvpReportTotalsDto } from '@/lib/api/types';

export function RsvpReportTiles({ totals }: { totals: RsvpReportTotalsDto }) {
    const t = useTranslations('ManagePage.rsvpStats');

    return (
        <MetricStrip
            items={[
                { key: 'responses', label: t('responses'), value: totals.responses },
                { key: 'people', label: t('totalPeople'), value: totals.people },
                { key: 'adults', label: t('adults'), value: totals.adults },
                { key: 'kids', label: t('kids'), value: totals.children },
            ]}
        />
    );
}
