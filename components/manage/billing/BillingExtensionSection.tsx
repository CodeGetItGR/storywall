import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import Section from '@/components/manage/Section';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { AppLink } from '@/components/ui/AppLink';
import { useCoverageExtensionSection } from '@/hooks/useCoverageExtensionSection';
import type { EventStatus } from '@/lib/api/types';
import { EXTEND_COVERAGE_SECTION_ID } from '@/lib/billing';
import { INCIDENT_MODE } from '@/lib/incident';
import { cn } from '@/lib/utils';

const BUY_CLASS_NAME =
    'inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white tabular-nums transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto';

export function BillingExtensionSection({
    eventId,
    eventStatus,
    coverageEndsAt,
    canPurchase,
}: {
    eventId: string;
    eventStatus: EventStatus;
    coverageEndsAt: string | null;
    canPurchase: boolean;
}) {
    const t = useTranslations('EventPlanSettingsPage.extension');
    const { visible, ended, rows } = useCoverageExtensionSection({ eventId, eventStatus, coverageEndsAt, canPurchase });

    if (!visible) return null;

    return (
        <TargetedSection id={EXTEND_COVERAGE_SECTION_ID}>
            <Section title={t('title')} divider>
                {/* Incident note */}
                {!ended && <IncidentPausedNote className="mb-3" />}

                {/* Ended */}
                {ended ? (
                    <p className="text-sm text-ink-muted">{t('ended')}</p>
                ) : (
                    /* Options */
                    <ul className="divide-y divide-ink/10">
                        {rows.map((row) => (
                            <li key={row.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-ink">{row.monthsLabel}</p>
                                    <p className="mt-1 text-xs text-ink-muted">{row.endsAtLabel}</p>
                                </div>
                                {INCIDENT_MODE ? (
                                    <span role="link" aria-disabled="true" className={cn(BUY_CLASS_NAME, 'cursor-not-allowed opacity-40')}>
                                        {row.buttonLabel}
                                    </span>
                                ) : (
                                    <AppLink href={row.href} aria-label={row.buttonAriaLabel} className={BUY_CLASS_NAME}>
                                        {row.buttonLabel}
                                    </AppLink>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>
        </TargetedSection>
    );
}
