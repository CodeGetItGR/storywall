'use client';

import { useTranslations } from 'next-intl';

import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

const TIME_KEYS = ['medianHoursToVerify', 'medianHoursToFirstEvent', 'medianHoursFirstEventToPaid'] as const;

export function FunnelTimeToConvert({ timeToConvert }: { timeToConvert: FunnelMetricsResponseDto['timeToConvert'] }) {
    const t = useTranslations('AdminPage.funnel.time');
    const format = useFunnelFormat();

    return (
        <FunnelGroup title={t('title')} window="signup" note={t('note')}>
            <FunnelFigures
                className="sm:grid-cols-3 lg:grid-cols-3"
                figures={TIME_KEYS.map((key) => ({ key, label: t(key), value: format.hours(timeToConvert[key]) }))}
            />
        </FunnelGroup>
    );
}
