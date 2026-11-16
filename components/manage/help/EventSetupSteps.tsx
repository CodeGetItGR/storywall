'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { HelpStep } from '@/components/manage/help/HelpStep';
import { HelpStepper } from '@/components/manage/help/HelpStepper';
import { useEventSetupSteps } from '@/hooks/useEventSetupSteps';
import type { EventDetailResponseDto } from '@/lib/api/types';

/** The setup steps on the Overview (they used to be the Help section). */
export function EventSetupSteps({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('HostOnboarding');
    const steps = useEventSetupSteps(event);
    const headingId = useId();

    return (
        <section aria-labelledby={headingId} className="flex flex-col">
            {/* Heading */}
            <div className="mb-5">
                <h2 id={headingId} className="text-base font-semibold text-ink">
                    {t('steps.section.title')}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{t('steps.section.body')}</p>
            </div>

            {/* Steps */}
            <HelpStepper>
                {steps.map((step, index) => (
                    <HelpStep
                        key={step.key}
                        index={index + 1}
                        title={step.title}
                        body={step.body}
                        complete={step.complete}
                        actions={step.actions}
                        isLast={index === steps.length - 1}
                    />
                ))}
            </HelpStepper>
        </section>
    );
}
