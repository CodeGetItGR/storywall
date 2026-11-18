import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhaseStepper } from '@/components/manage/overview/PhaseStepper';
import type { PhaseStep } from '@/hooks/useEventJourneyPhase';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const steps: PhaseStep[] = [
    { phase: 'before', label: 'Before', caption: 'Done', state: 'done' },
    { phase: 'day', label: 'On the day', caption: 'Today', state: 'current' },
    { phase: 'after', label: 'After', caption: 'From 13 Dec', state: 'upcoming' },
];

afterEach(cleanup);

describe('PhaseStepper', () => {
    it('marks the current phase and the one on screen', () => {
        render(<PhaseStepper steps={steps} selected="after" onSelect={vi.fn()} />);
        expect(screen.getByRole('group', { name: 'journey.phases.label' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /On the day/ })).toHaveAttribute('aria-current', 'step');
        expect(screen.getByRole('button', { name: /After/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects a phase on tap', () => {
        const onSelect = vi.fn();
        render(<PhaseStepper steps={steps} selected="day" onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: /Before/ }));
        expect(onSelect).toHaveBeenCalledWith('before');
    });
});
