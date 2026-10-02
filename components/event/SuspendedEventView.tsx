'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { guidelinesRuleHref } from '@/lib/guidelinesRules';
import { routes } from '@/lib/routes';

const TERM = 'text-xs font-bold tracking-wide text-ink-faint uppercase';

// What a host sees instead of a suspended StoryWall: when, why, which rule, the admin's own words,
// and how to disagree (Guidelines §19, §22). No tabs, no settings: everything else is refused (4015).
// A closed StoryWall shows the same statement, plus the date it is deleted for good.
// billingHref: the primary host's way to the billing and withdrawal page; null for everyone else.
export function SuspendedEventView({ event, billingHref = null }: { event: EventDetailResponseDto; billingHref?: string | null }) {
    const t = useTranslations('SuspendedEvent');
    const tStatement = useTranslations('ModerationStatement');
    const locale = useLocale();
    const suspension = event.suspension;
    const timeZone = event.schedule.timezone;
    const deletesOn = suspension?.closedAt ? suspension.deletesOn : null;
    const headingRef = useRef<HTMLHeadingElement>(null);

    // The view can replace the page under a host who is mid-task (a 4015 refetch): move focus to it.
    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <section aria-labelledby="suspended-event-title" className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
            {/* Heading */}
            <div className="space-y-2">
                <ShieldAlert className="h-8 w-8 text-status-danger" aria-hidden="true" />
                <h1 ref={headingRef} tabIndex={-1} id="suspended-event-title" className="text-2xl font-bold text-ink outline-none">
                    {deletesOn ? t('closedTitle') : t('title')}
                </h1>
                <p className="text-sm text-ink-muted">{event.title}</p>
            </div>

            {suspension ? (
                <p className="text-sm text-ink">
                    {deletesOn
                        ? t('closedBody', {
                              date: formatDate(locale, suspension.suspendedAt, { dateStyle: 'long', timeZone }),
                              deletesOn: formatDate(locale, deletesOn, { dateStyle: 'long', timeZone }),
                          })
                        : t('body', { date: formatDate(locale, suspension.suspendedAt, { dateStyle: 'long', timeZone }) })}
                </p>
            ) : null}

            {/* The statement of reasons */}
            <dl className="space-y-4">
                {suspension?.ground ? (
                    <div className="space-y-1">
                        <dt className={TERM}>{t('ground')}</dt>
                        <dd className="text-sm text-ink">{tStatement(`grounds.${suspension.ground}`)}</dd>
                    </div>
                ) : null}
                {suspension?.rule ? (
                    <div className="space-y-1">
                        <dt className={TERM}>{t('rule')}</dt>
                        <dd className="flex flex-wrap items-baseline gap-2 text-sm text-ink">
                            <span>{tStatement(`rules.${suspension.rule}`)}</span>
                            <Link href={guidelinesRuleHref(suspension.rule)} className="font-semibold text-primary-dark underline">
                                {t('readRule')}
                            </Link>
                        </dd>
                    </div>
                ) : null}
                {suspension?.explanation ? (
                    <div className="space-y-1">
                        <dt className={TERM}>{t('explanation')}</dt>
                        <dd className="text-sm break-words whitespace-pre-wrap text-ink">{suspension.explanation}</dd>
                    </div>
                ) : null}
            </dl>

            {/* Redress: the same reference and address as the statement email */}
            <div className="space-y-2 text-sm text-ink-muted">
                <p>{t('humanDecision')}</p>
                {suspension ? (
                    <p className="break-words">
                        {suspension.contactEmail
                            ? t('redressWithContact', { email: suspension.contactEmail, reference: suspension.reference })
                            : t('redressWithoutContact', { reference: suspension.reference })}
                    </p>
                ) : null}
            </div>

            {/* The right of withdrawal stays open while suspended: primary host only */}
            {billingHref ? (
                <Link href={billingHref} className="block text-sm font-semibold text-primary-dark underline">
                    {t('billingLink')}
                </Link>
            ) : null}

            <Link href={routes.home} className="inline-flex min-h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-canvas">
                {t('back')}
            </Link>
        </section>
    );
}
