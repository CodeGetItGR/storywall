'use client';

import { useTranslations } from 'next-intl';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelRevenueByKind({ rows }: { rows: FunnelMetricsResponseDto['revenue']['byKind'] }) {
    const t = useTranslations('AdminPage.funnel.revenue');
    const format = useFunnelFormat();

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="py-2 pr-3 font-bold">{t('columns.kind')}</th>
                        <th className="px-3 py-2 font-bold">{t('columns.currency')}</th>
                        <th className="px-3 py-2 text-right font-bold">{t('columns.orders')}</th>
                        <th className="py-2 pl-3 text-right font-bold">{t('columns.amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={`${row.currency}-${row.kind}`} className="border-b border-border last:border-b-0">
                            <td className="py-2 pr-3 text-ink">{t.has(`kinds.${row.kind}`) ? t(`kinds.${row.kind}`) : row.kind}</td>
                            <td className="px-3 py-2 font-mono text-xs text-ink-muted">{row.currency}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{format.count(row.orders)}</td>
                            <td className="py-2 pl-3 text-right font-mono tabular-nums">{format.money(row.amountMinor, row.currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
