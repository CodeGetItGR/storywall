'use client';

import { useTranslations } from 'next-intl';

import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { rateOf } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelGuestToHost({ guestToHost }: { guestToHost: FunnelMetricsResponseDto['guestToHost'] }) {
    const t = useTranslations('AdminPage.funnel.guest');
    const format = useFunnelFormat();
    const { attendedFirst, thenHosted, thenPaid } = guestToHost;

    return (
        <FunnelGroup title={t('title')} window="signup" note={t('note')}>
            <FunnelFigures
                className="sm:grid-cols-3 lg:grid-cols-3"
                figures={[
                    { key: 'attendedFirst', label: t('attendedFirst'), value: format.count(attendedFirst) },
                    {
                        key: 'thenHosted',
                        label: t('thenHosted'),
                        value: format.count(thenHosted),
                        hint: t('ofGuests', { percent: format.rate(rateOf(thenHosted, attendedFirst)) }),
                    },
                    {
                        key: 'thenPaid',
                        label: t('thenPaid'),
                        value: format.count(thenPaid),
                        hint: t('ofGuests', { percent: format.rate(rateOf(thenPaid, attendedFirst)) }),
                    },
                ]}
            />
        </FunnelGroup>
    );
}
