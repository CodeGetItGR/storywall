import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DetailsStep } from '@/components/event/create/wizard/details/DetailsStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (ns: string) => (key: string, values?: Record<string, string>) =>
        values ? `${ns}.${key}:${Object.values(values).join(',')}` : `${ns}.${key}`,
}));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding', tagline: '' }) }));
vi.mock('@/hooks/useEventTypeVoice', () => ({ useEventTypeVoice: () => ({ titlePlaceholder: 'Maria & Nikos' }) }));
vi.mock('@/components/event/create/EventDetailsStep', () => ({
    EventDetailsStep: ({ timezoneField, showScheduleHint, addressPlaceholder, locationNote }: Record<string, unknown>) => (
        <div data-testid="fields" data-hint={String(showScheduleHint)} data-placeholder={String(addressPlaceholder)}>
            {timezoneField as ReactNode}
            {locationNote as ReactNode}
        </div>
    ),
}));
vi.mock('@/components/event/create/EventTimezoneField', () => ({ EventTimezoneField: () => <input aria-label="tz-field" /> }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function setup(overrides: Record<string, unknown> = {}) {
    form.current = {
        eventTypes: [{ eventTypeKey: 'WEDDING', imageUrl: null }],
        selectedEventType: 'WEDDING',
        title: 'Anna & Kostas',
        startAt: '2027-06-12T18:00',
        locationName: 'Agios Nikolaos',
        timezone: 'Europe/Athens',
        timezoneOptions: ['Europe/Athens'],
        timezoneError: null,
        onTimezoneChange: vi.fn(),
        ...overrides,
    };
    render(<DetailsStep />);
}

afterEach(cleanup);

describe('DetailsStep (wizard)', () => {
    it('shows the heading and a preview of what is typed', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.details.heading');
        expect(screen.getByText('CreateEventPage.wizard.details.preview')).toBeInTheDocument();
        expect(screen.getByText('Anna & Kostas')).toBeInTheDocument();
        expect(screen.getByText(/2027 · .* · Agios Nikolaos/)).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
    });

    it('shows the type placeholder until a title is typed', () => {
        setup({ title: '  ' });
        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
    });

    it('hides the schedule hint and uses the wizard address placeholder', () => {
        setup();
        const fields = screen.getByTestId('fields');
        expect(fields).toHaveAttribute('data-hint', 'false');
        expect(fields).toHaveAttribute('data-placeholder', 'CreateEventPage.wizard.details.addressPlaceholder');
    });

    it('shows the time zone as one line until Change is tapped', () => {
        setup();
        expect(screen.getByText(/CreateEventPage.wizard.details.timeZone:Europe\/Athens/)).toBeInTheDocument();
        expect(screen.queryByLabelText('tz-field')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'CreateEventPage.selection.change' }));
        expect(screen.getByLabelText('tz-field')).toBeInTheDocument();
    });

    it('notes that the reception can be added later for weddings and baptisms', () => {
        setup();
        expect(screen.getByText('CreateEventPage.wizard.details.receptionLater')).toBeInTheDocument();
        cleanup();
        setup({ selectedEventType: 'BAPTISM', eventTypes: [{ eventTypeKey: 'BAPTISM', imageUrl: null }] });
        expect(screen.getByText('CreateEventPage.wizard.details.receptionLater')).toBeInTheDocument();
    });

    it('has no reception note for other types', () => {
        setup({ selectedEventType: 'BIRTHDAY', eventTypes: [{ eventTypeKey: 'BIRTHDAY', imageUrl: null }] });
        expect(screen.queryByText('CreateEventPage.wizard.details.receptionLater')).not.toBeInTheDocument();
    });

    it('opens the time zone field when it has an error', () => {
        setup({ timezoneError: 'Pick a time zone' });
        expect(screen.getByLabelText('tz-field')).toBeInTheDocument();
    });
});
