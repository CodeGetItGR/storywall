'use client';

import { useTranslations } from 'next-intl';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { VisitorsCountTable } from '@/components/admin/visitors/VisitorsCountTable';
import { sectionRows } from '@/lib/adminVisitors';
import type { VisitorMetricsDto } from '@/lib/api/types';

// Section, placement and plan codes are shown as sent (mono): they name places on the page, not words.
export function VisitorsLanding({ landing, visitors }: { landing: VisitorMetricsDto['landing']; visitors: number }) {
    const t = useTranslations('AdminPage.visitors');

    const clicks = landing.clicks.map((row) => ({
        key: `${row.event}:${row.placement}`,
        label: (
            <>
                {t(`landing.events.${row.event}`)} <span className="ml-1 font-mono text-xs text-ink-faint">{row.placement}</span>
            </>
        ),
        count: row.count,
    }));
    const plans = landing.plans.map((row) => ({ key: row.plan, label: <span className="font-mono text-xs">{row.plan}</span>, count: row.count }));
    const faq = landing.faq.map((row) => ({ key: String(row.question), label: t('landing.questionNumber', { number: row.question }), count: row.count }));

    return (
        <FunnelGroup title={t('landing.title')} window="visit">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Scroll depth */}
                {landing.sections.length === 0 ? (
                    <div className="min-w-0">
                        <h3 className="mb-2 text-xs font-semibold text-ink-muted">{t('landing.sections')}</h3>
                        <p className="text-sm text-ink-muted">{t('empty')}</p>
                    </div>
                ) : (
                    <FunnelBreakdown title={t('landing.sections')} rows={sectionRows(landing.sections, visitors)} />
                )}

                {/* Button clicks */}
                <VisitorsCountTable title={t('landing.clicks')} columns={[t('landing.button'), t('landing.count')]} rows={clicks} />

                {/* Plan clicks */}
                <VisitorsCountTable title={t('landing.plans')} columns={[t('landing.plan'), t('landing.count')]} rows={plans} />

                {/* FAQ opens */}
                <VisitorsCountTable title={t('landing.faq')} columns={[t('landing.question'), t('landing.opens')]} rows={faq} />
            </div>
        </FunnelGroup>
    );
}
