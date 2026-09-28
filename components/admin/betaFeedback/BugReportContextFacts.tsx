'use client';

import { useTranslations } from 'next-intl';

import type { BugReportResponseDto } from '@/lib/api/types';

export function BugReportContextFacts({ report }: { report: BugReportResponseDto }) {
    const t = useTranslations('AdminPage.bugReports');
    const tRole = useTranslations('AdminPage.accounts.role');
    const viewport = report.viewportWidth && report.viewportHeight ? `${report.viewportWidth}×${report.viewportHeight}` : null;

    const facts: Array<{ label: string; value: string | null; mono?: boolean; wide?: boolean }> = [
        { label: t('facts.page'), value: report.pageUrl, mono: true, wide: true },
        { label: t('facts.reporter'), value: tRole(report.reporterRole) },
        { label: t('facts.appVersion'), value: report.appVersion, mono: true },
        { label: t('facts.locale'), value: report.locale, mono: true },
        { label: t('facts.timeZone'), value: report.timeZone, mono: true },
        { label: t('facts.viewport'), value: viewport, mono: true },
        { label: t('facts.displayMode'), value: report.displayMode, mono: true },
        { label: t('facts.userAgent'), value: report.userAgent, mono: true, wide: true },
    ];

    return (
        <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('context')}</h3>
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                {facts.map((fact) => (
                    <div key={fact.label} className={fact.wide ? 'sm:col-span-2' : undefined}>
                        <dt className="text-xs text-ink-faint">{fact.label}</dt>
                        <dd className={fact.mono ? 'mt-1 font-mono text-xs break-all text-ink-muted' : 'mt-1 font-semibold text-ink'}>
                            {fact.value ?? '—'}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
