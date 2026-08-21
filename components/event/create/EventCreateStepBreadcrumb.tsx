'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

const STEPS = ['type', 'plan', 'addons', 'details', 'overview'] as const;

export type CreateEventStep = (typeof STEPS)[number];

export function EventCreateStepBreadcrumb({
    step,
    onGoToType,
    onGoToPlan,
    onGoToAddons,
    onGoToDetails,
}: {
    step: CreateEventStep;
    onGoToType: () => void;
    onGoToPlan: () => void;
    onGoToAddons: () => void;
    onGoToDetails: () => void;
}) {
    const t = useTranslations('CreateEventPage');
    const currentIndex = STEPS.indexOf(step);
    const goTo: Partial<Record<CreateEventStep, () => void>> = {
        type: onGoToType,
        plan: onGoToPlan,
        addons: onGoToAddons,
        details: onGoToDetails,
    };

    return (
        <nav aria-label={t('steps.navigationLabel')} className="flex items-center gap-1 overflow-x-auto pb-1 text-sm font-semibold w-auto justify-between">
            {STEPS.map((item, index) => {
                const isCurrent = item === step;
                const isPast = index < currentIndex;

                return (
                    <>
                        {index > 0 && <ChevronRight className="h-5.5 w-5.5 shrink-0 text-ink-faint" key={`chevron-${index}`} />}
                        <span key={item} className="flex shrink-0 items-center gap-1">
                            {isPast ? (
                                <button
                                    type="button"
                                    onClick={goTo[item]}
                                    className="text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
                                >
                                    {t(`steps.${item}`)}
                                </button>
                            ) : (
                                <span aria-current={isCurrent ? 'step' : undefined} className={isCurrent ? 'text-ink' : 'text-ink-faint'}>
                                    {t(`steps.${item}`)}
                                </span>
                            )}
                        </span>
                    </>
                );
            })}
        </nav>
    );
}
