'use client';

import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import { ModuleUsageMetricTableRow } from '@/components/admin/moduleUsage/ModuleUsageMetricTableRow';
import { ModuleUsageModuleTableRow } from '@/components/admin/moduleUsage/ModuleUsageModuleTableRow';
import type { ModuleUsageModuleRow } from '@/lib/adminModuleUsage';

export function ModuleUsageTable({ rows }: { rows: ModuleUsageModuleRow[] }) {
    const t = useTranslations('AdminPage.moduleUsage.columns');

    return (
        <section className="min-w-0 rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    {/* Columns */}
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <th className="px-5 py-3 font-bold">{t('module')}</th>
                            <th className="px-3 py-3 text-right font-bold">{t('events')}</th>
                            <th className="px-3 py-3 text-right font-bold">{t('used')}</th>
                            <th className="px-3 py-3 text-right font-bold">{t('average')}</th>
                            <th className="px-5 py-3 text-right font-bold">{t('median')}</th>
                        </tr>
                    </thead>

                    {/* Modules, each followed by its metrics */}
                    <tbody>
                        {rows.map((row) => (
                            <Fragment key={row.moduleKey}>
                                <ModuleUsageModuleTableRow row={row} />
                                {!row.suppressed && row.metrics.map((metric) => <ModuleUsageMetricTableRow key={metric.key} metric={metric} />)}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
