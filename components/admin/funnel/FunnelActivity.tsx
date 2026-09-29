'use client';

import { useTranslations } from 'next-intl';

import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

const ACTIVITY_KEYS = ['activeLast7Days', 'activeLast30Days', 'inactiveOver30Days', 'neverRecorded'] as const;

export function FunnelActivity({ activity }: { activity: FunnelMetricsResponseDto['activity'] }) {
    const t = useTranslations('AdminPage.funnel.activity');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup" note={t('note')}>
            <FunnelFigures
                className="lg:grid-cols-4"
                figures={ACTIVITY_KEYS.map((key) => ({ key, label: t(key), value: format.count(activity[key]) }))}
            />
        </FunnelGroup>
    );
}
