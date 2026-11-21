import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCreateEventWizardAccountPreview } from '@/hooks/useCreateEventWizardAccountPreview';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding', tagline: '' }) }));

function preview(asksDetails: boolean) {
    form.current = {
        eventTypes: [{ eventTypeKey: 'WEDDING', imageUrl: null }],
        selectedEventType: 'WEDDING',
        trimmedTitle: 'Anna & Kostas',
        startAt: '2027-06-12T18:00',
        selectedPlan: { name: 'QR' },
        asksDetails,
    };
    return renderHook(() => useCreateEventWizardAccountPreview()).result.current;
}

describe('useCreateEventWizardAccountPreview', () => {
    it('shows the date and the plan', () => {
        expect(preview(true).line).toMatch(/2027.* · QR$/);
    });

    it('shows only the plan on a lite plan, even with a date left from another plan', () => {
        expect(preview(false).line).toBe('QR');
    });
});
