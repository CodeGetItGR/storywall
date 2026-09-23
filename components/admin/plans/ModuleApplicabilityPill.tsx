'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { EventTypeModuleApplicability } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const OPTIONS: EventTypeModuleApplicability[] = ['UNSUPPORTED', 'DEFAULT_OFF', 'DEFAULT_ON'];

export function ModuleApplicabilityPill({
    moduleKey,
    value,
    onRequestChangeAction,
}: {
    moduleKey: string;
    value: EventTypeModuleApplicability;
    onRequestChangeAction: (moduleKey: string, next: EventTypeModuleApplicability) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.applicability');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onRequestChangeAction(moduleKey, event.currentTarget.dataset.value as EventTypeModuleApplicability);
    }

    return (
        <div role="group" aria-label={t('label')} className="inline-flex gap-0.5 rounded-md bg-canvas p-0.5">
            {OPTIONS.map((option) => (
                <button
                    key={option}
                    type="button"
                    data-value={option}
                    onClick={handleClick}
                    aria-pressed={value === option}
                    className={cn(
                        'rounded px-1.5 py-0.5 text-[10.5px] font-bold transition-colors',
                        value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t(option)}
                </button>
            ))}
        </div>
    );
}
