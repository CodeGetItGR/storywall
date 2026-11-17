import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { AppLink } from '@/components/ui/AppLink';
import { useCoverageExtensionSection } from '@/hooks/useCoverageExtensionSection';
import type { EventStatus } from '@/lib/api/types';
import { EXTEND_COVERAGE_SECTION_ID } from '@/lib/billing';
import { INCIDENT_MODE } from '@/lib/incident';
import { cn } from '@/lib/utils';

const BUY_CLASS_NAME =
    'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold whitespace-nowrap text-white tabular-nums transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

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
    const { visible, ended, rows, selected, select, handleKeyDown } = useCoverageExtensionSection({ eventId, eventStatus, coverageEndsAt, canPurchase });

    function handlePick(event: MouseEvent<HTMLButtonElement>) {
        const { radioId } = event.currentTarget.dataset;
        if (radioId) select(radioId);
    }

    if (!visible) return null;

    return (
        <TargetedSection id={EXTEND_COVERAGE_SECTION_ID} className="flex flex-col gap-2.5 rounded-[22px]">
            {/* Heading */}
            <h2 id="billing-extend-title" className="text-base font-bold text-ink">
                {t('title')}
            </h2>

            {/* Incident note */}
            {!ended && <IncidentPausedNote />}

            {/* Ended */}
            {ended || !selected ? (
                <p className="text-sm text-ink-muted">{t('ended')}</p>
            ) : (
                <>
                    {/* Lengths */}
                    <div role="radiogroup" aria-labelledby="billing-extend-title" onKeyDown={handleKeyDown} className="grid grid-cols-3 gap-2">
                        {rows.map((row) => {
                            const isSelected = row.id === selected.id;
                            return (
                                <button
                                    key={row.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    data-radio-id={row.id}
                                    tabIndex={isSelected ? 0 : -1}
                                    onClick={handlePick}
                                    className={cn(
                                        'focus-ring flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-ink transition-colors',
                                        isSelected ? 'bg-primary-light shadow-[inset_0_0_0_2px_var(--color-primary)]' : 'bg-surface-muted hover:bg-surface-muted/70',
                                    )}
                                >
                                    <span className="text-sm font-bold">{row.monthsLabel}</span>
                                    <span className="text-[13px] text-ink-muted tabular-nums">{row.priceLabel}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Estimate */}
                    <p className="text-[13px] text-ink-muted">{selected.endsAtLabel}</p>

                    {/* Action */}
                    {INCIDENT_MODE ? (
                        <span role="link" aria-disabled="true" className={cn(BUY_CLASS_NAME, 'cursor-not-allowed opacity-40')}>
                            {selected.buttonLabel}
                        </span>
                    ) : (
                        <AppLink href={selected.href} aria-label={selected.buttonAriaLabel} className={BUY_CLASS_NAME}>
                            {selected.buttonLabel}
                        </AppLink>
                    )}
                </>
            )}
        </TargetedSection>
    );
}
