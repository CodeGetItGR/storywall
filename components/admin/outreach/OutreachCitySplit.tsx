'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { OutreachGroup } from '@/components/admin/outreach/OutreachGroup';
import { PlatformMetricBar } from '@/components/admin/PlatformMetricBar';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { outreachCityRows } from '@/lib/adminOutreach';
import type { OutreachSummaryDto } from '@/lib/api/types';

export function OutreachCitySplit({ byCity }: { byCity: OutreachSummaryDto['byCity'] }) {
    const t = useTranslations('AdminPage.outreach.cities');
    const format = useOutreachFormat();
    const rows = useMemo(() => outreachCityRows(byCity), [byCity]);

    return (
        <OutreachGroup title={t('title')} caption={rows.length > 0 ? t('caption') : undefined}>
            {rows.length === 0 && <p className="text-sm text-ink-muted">{t('empty')}</p>}

            {/* Cities */}
            <ul className="space-y-3">
                {rows.map((row) => (
                    <li key={row.city} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="truncate text-sm font-semibold text-ink">{row.city}</span>
                        <PlatformMetricBar ratio={row.share ?? 0} className="h-2.5" />
                        <span className="text-right text-xs text-ink-muted tabular-nums">
                            {t('contactedOf', { contacted: format.count(row.contacted), total: format.count(row.total) })}
                        </span>
                    </li>
                ))}
            </ul>
        </OutreachGroup>
    );
}
