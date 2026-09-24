'use client';

import { CalendarCheck, Lock, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { ProjectedCoverageDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

/**
 * What activation means, said before the pay button. The kept-until line
 * renders from `projectedCoverage` (the server's for a draft, an estimate from
 * the picked duration in the create wizard) and drops out when it is absent.
 */
export function ActivationDisclosures({ projectedCoverage }: { projectedCoverage: ProjectedCoverageDto | null }) {
    const t = useTranslations('CheckoutReviewPage.activation');
    const locale = useLocale();
    const dateOf = (value: string) => formatDate(locale, value, { dateStyle: 'medium' });

    const lines = [
        { key: 'activatesToday', icon: CalendarCheck, title: t('activatesTodayTitle'), body: t('activatesTodayBody') },
        ...(projectedCoverage
            ? [
                  {
                      key: 'keptUntil',
                      icon: Trash2,
                      title: t('keptUntilTitle', { date: dateOf(projectedCoverage.coverageEndsAt) }),
                      body: t('keptUntilBody', { months: projectedCoverage.hostingMonths }),
                  },
              ]
            : []),
        { key: 'datesFixed', icon: Lock, title: t('datesFixedTitle'), body: t('datesFixedBody') },
    ];

    return (
        <section aria-labelledby="activation-disclosures-title">
            <h2 id="activation-disclosures-title" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                {t('title')}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
                {lines.map(({ key, icon: Icon, title, body }) => (
                    <li key={key} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{title}</p>
                            <p className="text-xs text-ink-muted">{body}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
