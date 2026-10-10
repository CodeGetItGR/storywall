'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type CreateEventStep, useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventCreateStepBreadcrumb() {
    const t = useTranslations('CreateEventPage');
    const { step, steps, goToType, goToPlan, goToDetails, goToTheme, selectedEventType } = useCreateEventForm();
    const moduleCopy = useModuleCopy(selectedEventType);
    // The theme step is named after the theme module, as the event type calls it.
    const stepLabel = (item: CreateEventStep) => (item === 'theme' ? moduleCopy('theme').name : t(`steps.${item}`));
    const currentIndex = steps.indexOf(step);
    const goTo: Partial<Record<CreateEventStep, () => void>> = {
        type: goToType,
        plan: goToPlan,
        details: goToDetails,
        theme: goToTheme,
    };

    return (
        <nav
            aria-label={t('steps.navigationLabel')}
            className="flex w-auto items-center justify-between gap-1 overflow-x-auto pb-1 text-sm font-semibold"
        >
            {steps.map((item, index) => {
                const isCurrent = item === step;
                const isPast = index < currentIndex;

                return (
                    <Fragment key={item}>
                        {index > 0 && <ChevronRight className="h-5.5 w-5.5 shrink-0 text-ink-faint" />}
                        <span className="flex shrink-0 items-center gap-1">
                            {isPast ? (
                                <button
                                    type="button"
                                    onClick={goTo[item]}
                                    className="text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
                                >
                                    {stepLabel(item)}
                                </button>
                            ) : (
                                <span aria-current={isCurrent ? 'step' : undefined} className={isCurrent ? 'text-ink' : 'text-ink-faint'}>
                                    {stepLabel(item)}
                                </span>
                            )}
                        </span>
                    </Fragment>
                );
            })}
        </nav>
    );
}
