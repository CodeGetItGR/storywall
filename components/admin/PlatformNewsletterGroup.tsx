'use client';

import { useTranslations } from 'next-intl';

import { PlatformMetricFigure } from '@/components/admin/PlatformMetricFigure';
import { PlatformMetricGroup } from '@/components/admin/PlatformMetricGroup';
import type { PlatformMetricsResponseDto } from '@/lib/api/types';
import { formatCount } from '@/lib/format';

const KEYS = ['confirmed', 'pending', 'unsubscribed', 'rewardsIssued'] as const;

export function PlatformNewsletterGroup({ newsletter }: { newsletter: PlatformMetricsResponseDto['newsletter'] }) {
    const t = useTranslations('AdminPage.metrics.newsletter');

    return (
        <PlatformMetricGroup title={t('title')}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {KEYS.map((key) => (
                    <PlatformMetricFigure key={key} label={t(key)} value={formatCount(newsletter[key])} />
                ))}
            </div>
        </PlatformMetricGroup>
    );
}
