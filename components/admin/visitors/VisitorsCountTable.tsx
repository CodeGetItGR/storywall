'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useFunnelFormat } from '@/hooks/useFunnelFormat';

export type VisitorsCountRow = { key: string; label: ReactNode; count: number; title?: string };

// A titled list of labels and counts, or "No data yet".
export function VisitorsCountTable({ title, columns, rows }: { title?: string; columns: [string, string]; rows: VisitorsCountRow[] }) {
    const t = useTranslations('AdminPage.visitors');
    const format = useFunnelFormat();

    return (
        <div className="min-w-0">
            {title ? <h3 className="mb-2 text-xs font-semibold text-ink-muted">{title}</h3> : null}
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table aria-label={title ?? columns[0]} className="w-full table-fixed border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="py-2 pr-3 font-bold">{columns[0]}</th>
                                <th className="w-24 py-2 pl-3 text-right font-bold">{columns[1]}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key} className="border-b border-border last:border-b-0">
                                    <td title={row.title} className="truncate py-2 pr-3 text-ink">
                                        {row.label}
                                    </td>
                                    <td className="py-2 pl-3 text-right font-mono tabular-nums">{format.count(row.count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
