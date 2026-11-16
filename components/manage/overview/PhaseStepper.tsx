'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PhaseStep } from '@/hooks/useEventJourneyPhase';
import type { JourneyPhase } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

function PhaseButton({ step, selected, onSelect }: { step: PhaseStep; selected: boolean; onSelect: (phase: JourneyPhase) => void }) {
    const handleClick = useCallback(() => onSelect(step.phase), [onSelect, step.phase]);
    return (
        <button
            type="button"
            onClick={handleClick}
            aria-pressed={selected}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="group relative flex min-h-11 flex-1 flex-col items-start text-left first:items-start last:items-end last:text-right [&:nth-child(2)]:items-center [&:nth-child(2)]:text-center"
        >
            {/* Dot */}
            <span
                aria-hidden="true"
                className={cn(
                    'mb-2 block h-3.5 w-3.5 rounded-full border-2',
                    step.state === 'done' && 'border-emerald-600 bg-emerald-600',
                    step.state === 'current' && 'border-primary bg-primary ring-4 ring-primary/20',
                    step.state === 'upcoming' && 'border-[#f0e2d2] bg-event',
                )}
            />
            {/* Label and caption */}
            <span className={cn('text-sm leading-tight', selected ? 'font-bold text-ink' : 'font-semibold text-ink-muted')}>{step.label}</span>
            <span className="text-xs text-ink-muted">{step.caption}</span>
        </button>
    );
}

function progressWidth(steps: PhaseStep[]): string {
    const done = steps.filter((step) => step.state === 'done').length;
    if (done >= 2) return '100%';
    if (done === 1) return '50%';
    return '0%';
}

/** Before / On the day / After. The current phase is marked; tapping one shows its journey. */
export function PhaseStepper({ steps, selected, onSelect }: { steps: PhaseStep[]; selected: JourneyPhase; onSelect: (phase: JourneyPhase) => void }) {
    const t = useTranslations('ManagePage');
    return (
        <div role="group" aria-label={t('journey.phases.label')} className="relative flex gap-2">
            {/* Track */}
            <span aria-hidden="true" className="absolute top-[0.4rem] right-2 left-2 h-1 rounded-full bg-[#f0e2d2]/70" />
            {/* Progress */}
            <span aria-hidden="true" className="bg-gradient-logo absolute top-[0.4rem] left-2 h-1 max-w-[calc(100%-1rem)] rounded-full" style={{ width: progressWidth(steps) }} />
            {steps.map((step) => (
                <PhaseButton key={step.phase} step={step} selected={step.phase === selected} onSelect={onSelect} />
            ))}
        </div>
    );
}
