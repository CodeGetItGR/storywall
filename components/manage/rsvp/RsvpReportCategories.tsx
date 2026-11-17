'use client';

import { useTranslations } from 'next-intl';

import type { RsvpReportCategoryDto } from '@/lib/api/types';
import { reportSectionKey } from '@/lib/rsvpReport';

const defaultHeadingClass = 'mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase';

// headingClassName: the RSVP page gives the heading its own look; the report page keeps this one.
export function RsvpReportCategories({
    categories,
    headingClassName = defaultHeadingClass,
}: {
    categories: RsvpReportCategoryDto[];
    headingClassName?: string;
}) {
    const t = useTranslations('ManagePage');

    return (
        <section>
            {/* Heading */}
            <h2 className={headingClassName}>{t('rsvpStats.byCategory')}</h2>

            {/* Categories */}
            <ul className="flex flex-col gap-3">
                {categories.map((category) => (
                    <li key={reportSectionKey(category)} className="break-inside-avoid">
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                            <span className="min-w-0 text-ink-muted">{category.label}</span>
                            <span className="shrink-0 font-bold text-ink tabular-nums">
                                {category.attending
                                    ? t('rsvpReport.people', { count: category.people })
                                    : t('rsvpReport.responses', { count: category.responses })}
                                {category.percentOfPeople !== null && (
                                    <>
                                        {' '}
                                        <span className="font-normal text-ink-faint">{category.percentOfPeople}%</span>
                                    </>
                                )}
                            </span>
                        </div>
                        {category.percentOfPeople !== null && (
                            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${category.percentOfPeople}%` }} />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
