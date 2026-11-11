import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewStep } from '@/components/event/create/wizard/review/ReviewStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding', tagline: '' }) }));
vi.mock('@/components/event/create/EventOverviewStep', () => ({
    EventOverviewStep: ({ showEventSummary }: { showEventSummary?: boolean }) => <div data-testid="overview" data-summary={String(showEventSummary)} />,
}));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function setup() {
    const goToDetails = vi.fn();
    const goToPlan = vi.fn();
    form.current = {
        eventTypes: [{ eventTypeKey: 'WEDDING', imageUrl: null }],
        selectedEventType: 'WEDDING',
        trimmedTitle: 'Anna & Kostas',
        startAt: '2027-06-12T18:00',
        locationName: 'Agios Nikolaos',
        selectedPlan: { name: 'STORY', maxMembers: 300, storageBytes: null },
        selectedOption: { months: 6 },
        goToDetails,
        goToPlan,
    };
    render(<ReviewStep />);
    return { goToDetails, goToPlan };
}

afterEach(cleanup);

describe('ReviewStep (wizard)', () => {
    it('shows the heading, the event row and the plan row', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.review.heading');
        expect(screen.getByText('Anna & Kostas')).toBeInTheDocument();
        expect(screen.getByText(/2027 · Agios Nikolaos/)).toBeInTheDocument();
        expect(screen.getByText('STORY · Durations.months:6')).toBeInTheDocument();
        expect(screen.getByText('LandingPage.pricing.guestsUpTo:300 · LandingPage.pricing.storageUnlimited')).toBeInTheDocument();
    });

    it('goes to details from Edit and to the plan from Change', () => {
        const { goToDetails, goToPlan } = setup();
        fireEvent.click(screen.getByRole('button', { name: /CreateEventPage.wizard.review.edit/ }));
        fireEvent.click(screen.getByRole('button', { name: /CreateEventPage.selection.change/ }));
        expect(goToDetails).toHaveBeenCalled();
        expect(goToPlan).toHaveBeenCalled();
    });

    it("keeps today's price lines and notices without the old event summary", () => {
        setup();
        expect(screen.getByTestId('overview')).toHaveAttribute('data-summary', 'false');
    });
});
