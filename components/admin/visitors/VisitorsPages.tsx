'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { VisitorsCountTable } from '@/components/admin/visitors/VisitorsCountTable';
import { deviceRows, languageRows } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

export function VisitorsPages({ data }: { data: VisitorMetricsDto }) {
    const t = useTranslations('AdminPage.visitors');

    const pages = data.pages.map((row) => ({
        key: row.page ?? '__other__',
        label: row.page === null ? t('pages.other') : <span className="font-mono text-xs">{row.page}</span>,
        title: row.page ?? undefined,
        count: row.visits,
    }));

    return (
        <FunnelGroup title={t('pages.title')} window="visit">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                {/* Landing pages */}
                <VisitorsCountTable columns={[t('pages.page'), t('pages.visits')]} rows={pages} />

                {/* Language and device */}
                <div className="space-y-5">
                    <FunnelBreakdown
                        title={t('pages.language')}
                        rows={languageRows(data.languages)}
                        labels={{ el: t('languages.el'), en: t('languages.en') }}
                    />
                    <FunnelBreakdown
                        title={t('pages.device')}
                        rows={deviceRows(data.devices)}
                        labels={{ PHONE: t('devices.PHONE'), DESKTOP: t('devices.DESKTOP'), TABLET: t('devices.TABLET') }}
                    />
                </div>
            </div>
        </FunnelGroup>
    );
}
