'use client';

import { useTranslations } from 'next-intl';

import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

const STUCK_KEYS = ['unverifiedOver7Days', 'verifiedNoEvent', 'eventNeverPaid', 'abandonedCheckout', 'paidNotEngaged'] as const;

export function FunnelStuck({ stuck }: { stuck: FunnelMetricsResponseDto['stuck'] }) {
    const t = useTranslations('AdminPage.funnel.stuck');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup" note={t('note')}>
            <FunnelFigures
                figures={STUCK_KEYS.map((key) => ({
                    key,
                    label: t(key),
                    value: format.count(stuck[key]),
                    hint: key === 'abandonedCheckout' ? t('abandonedCheckoutHint') : undefined,
                }))}
            />
        </FunnelGroup>
    );
}
