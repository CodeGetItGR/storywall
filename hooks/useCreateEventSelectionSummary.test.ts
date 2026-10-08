import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCreateEventSelectionSummary } from '@/hooks/useCreateEventSelectionSummary';

const form = vi.hoisted(() => ({
    value: {
        step: 'type',
        selectedEventType: 'WEDDING',
        selectedPlan: undefined as { name: string } | undefined,
        goToType: () => {},
        goToPlan: () => {},
    },
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.value }));

const goToType = vi.fn();
const goToPlan = vi.fn();

function summaryAt(step: string, planName?: string) {
    form.value = { step, selectedEventType: 'WEDDING', selectedPlan: planName ? { name: planName } : undefined, goToType, goToPlan };
    return renderHook(() => useCreateEventSelectionSummary()).result.current;
}

describe('useCreateEventSelectionSummary', () => {
    it('names the event type on the plan step, editing it on the type step', () => {
        expect(summaryAt('plan', 'START')).toEqual({ label: 'Wedding', editLabel: 'changeType', onEdit: goToType });
    });

    it('names the type and plan on details and theme, editing them on the plan step', () => {
        expect(summaryAt('details', 'START')).toEqual({ label: 'Wedding · START', editLabel: 'changePlan', onEdit: goToPlan });
        expect(summaryAt('theme', 'STORY')?.label).toBe('Wedding · STORY');
    });

    it('shows nothing on the type and overview steps, or before a plan is known', () => {
        expect(summaryAt('type')).toBeNull();
        expect(summaryAt('overview', 'START')).toBeNull();
        expect(summaryAt('details')).toBeNull();
    });
});
