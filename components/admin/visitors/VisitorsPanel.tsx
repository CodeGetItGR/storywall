'use client';

import { useTranslations } from 'next-intl';

import { FunnelHeader } from '@/components/admin/funnel/FunnelHeader';
import { FunnelRangeControl } from '@/components/admin/funnel/FunnelRangeControl';
import { VisitorsChannels } from '@/components/admin/visitors/VisitorsChannels';
import { VisitorsDaily } from '@/components/admin/visitors/VisitorsDaily';
import { VisitorsLanding } from '@/components/admin/visitors/VisitorsLanding';
import { VisitorsLinkClicks } from '@/components/admin/visitors/VisitorsLinkClicks';
import { VisitorsPages } from '@/components/admin/visitors/VisitorsPages';
import { VisitorsSkeleton } from '@/components/admin/visitors/VisitorsSkeleton';
import { VisitorsTotals } from '@/components/admin/visitors/VisitorsTotals';
import { useVisitorsDashboard } from '@/hooks/useVisitorsDashboard';

export function VisitorsPanel() {
    const t = useTranslations('AdminPage.visitors');
    const { range, data, isLoading, isFetching, error, updatedAt, refresh, linkClicks, linkClicksFailed } = useVisitorsDashboard();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <FunnelHeader title={t('title')} updatedAt={updatedAt} isFetching={isFetching} onRefreshAction={refresh} />

            <div className="space-y-5">
                {/* Range */}
                <FunnelRangeControl range={range} note={t('cookiesNote')} />

                {/* States */}
                {isLoading && <VisitorsSkeleton />}
                {Boolean(error) && (
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-status-danger">{t('error')}</p>
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={isFetching}
                            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('retry')}
                        </button>
                    </div>
                )}
                {data && !data.configured && <p className="text-sm text-ink-muted">{t('notConfigured')}</p>}

                {data?.configured && (
                    <>
                        {/* Totals */}
                        <VisitorsTotals data={data} />

                        {/* Visitors over time */}
                        <VisitorsDaily daily={data.daily} />

                        {/* By source */}
                        <VisitorsChannels rows={data.channels} />

                        {/* Pages, language and device */}
                        <VisitorsPages data={data} />

                        {/* Landing page */}
                        <VisitorsLanding landing={data.landing} visitors={data.visitors} />
                    </>
                )}

                {/* Link clicks */}
                <VisitorsLinkClicks rows={linkClicks} failed={linkClicksFailed} />
            </div>
        </div>
    );
}
