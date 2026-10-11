'use client';

import { useTranslations } from 'next-intl';

import type { ModuleUsageMetricRow } from '@/lib/adminModuleUsage';

const NUMBER_CELL = 'px-3 py-2 text-right font-mono text-[13px] whitespace-nowrap text-ink-muted';

export function ModuleUsageMetricTableRow({ metric }: { metric: ModuleUsageMetricRow }) {
    const t = useTranslations('AdminPage.moduleUsage.metrics');

    return (
        <tr>
            {/* Metric */}
            <th scope="row" className="py-2 pr-3 pl-9 text-left font-normal text-ink-muted">
                {t(metric.key)}
            </th>
            <td className="px-3 py-2" />
            <td className={NUMBER_CELL}>{metric.share}</td>
            <td className={NUMBER_CELL}>{metric.average}</td>
            <td className={`${NUMBER_CELL} pr-5`}>{metric.median}</td>
        </tr>
    );
}
