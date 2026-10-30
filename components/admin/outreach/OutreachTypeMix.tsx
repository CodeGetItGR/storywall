'use client';

import { useTranslations } from 'next-intl';

import { OutreachGroup } from '@/components/admin/outreach/OutreachGroup';
import { OutreachStackedBar } from '@/components/admin/outreach/OutreachStackedBar';
import { OutreachStatusLegend } from '@/components/admin/outreach/OutreachStatusLegend';
import { useOutreachFormat } from '@/hooks/useOutreachFormat';
import { outreachStatusSegments, typeWithMostToContact } from '@/lib/adminOutreach';
import type { OutreachSummaryDto } from '@/lib/api/types';

export function OutreachTypeMix({ byType }: { byType: OutreachSummaryDto['byType'] }) {
    const t = useTranslations('AdminPage.outreach');
    const format = useOutreachFormat();
    const most = typeWithMostToContact(byType);

    return (
        <OutreachGroup
            title={t('typeMix.title')}
            caption={most ? t('typeMix.caption', { type: t(`types.${most.type}`), count: most.count }) : t('typeMix.captionDone')}
        >
            {/* Bars */}
            <ul className="space-y-3">
                {byType.map((row) => (
                    <li key={row.type} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                        <span className="truncate text-sm font-semibold text-ink">{t(`types.${row.type}`)}</span>
                        <OutreachStackedBar
                            segments={outreachStatusSegments(row.byStatus)}
                            label={t('typeMix.barLabel', { type: t(`types.${row.type}`), count: row.total })}
                        />
                        <span className="text-right text-sm font-bold text-ink tabular-nums">{format.count(row.total)}</span>
                    </li>
                ))}
            </ul>

            {/* Legend */}
            <div className="mt-4">
                <OutreachStatusLegend />
            </div>
        </OutreachGroup>
    );
}
