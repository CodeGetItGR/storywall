import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storyEvent, storySession } from '@/.storybook/fixtures';
import SettingsTab from '@/app/(main)/(app)/(event)/events/[eventId]/manage/SettingsTab';
import type { EventCapabilitiesDto, EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({
    isDesktop: false,
    sessions: [] as EventSessionResponseDto[],
    updateEvent: vi.fn(),
    venueSheet: [] as { open: boolean; editingSession: unknown; secondaryPrefillTitle?: string }[],
}));

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => mocks.isDesktop }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useEvent', () => ({
    useUpdateEvent: () => ({ mutateAsync: mocks.updateEvent, isPending: false, isError: false, error: null }),
}));
vi.mock('@/hooks/useMedia', () => ({ useUploadMedia: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }) }));
vi.mock('@/hooks/useEventSessions', () => ({
    useEventSessions: (eventId: string | null) => ({ data: eventId ? mocks.sessions : [] }),
    useCreateEventSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateEventSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useScheduleSessionLimit', () => ({ useScheduleSessionLimit: () => ({ atSessionLimit: false, sessionLimitMessage: undefined }) }));
vi.mock('@/hooks/useTargetedSection', () => ({ useTargetedSection: () => ({ sectionRef: { current: null }, isTargeted: false }) }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ alt }: { alt: string }) => <span>{alt}</span> }));
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet', () => ({
    ScheduleEditorSheet: (props: { open: boolean; editingSession: unknown; secondaryPrefillTitle?: string }) => {
        mocks.venueSheet.push(props);
        return props.open ? <div>venue sheet</div> : null;
    },
}));

const tSettings = messages.ManagePage.settings;
const editNamed = (title: string) => messages.ManagePage.sessionManagement.editNamed.replace('{title}', title);
const labels = messages.CreateEventPage.fieldLabels.WEDDING;
const venue = messages.HostOnboarding.steps.details;

const LITE: EventCapabilitiesDto = {
    kind: 'LITE',
    home: 'GALLERY',
    takesGuests: false,
    hasSchedule: false,
    showsDetailsSettings: false,
    showsShareLinks: false,
    showsGuestCode: true,
    guestCodeActions: [],
};

function weddingEvent(overrides: Partial<EventDetailResponseDto> = {}) {
    return storyEvent({ location: { name: 'Agios Nikolaos', address: 'Agiou Nikolaou 4', mapsUrl: null }, ...overrides });
}

function renderTab(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

beforeEach(() => {
    mocks.isDesktop = false;
    mocks.sessions = [storySession()];
    mocks.updateEvent.mockReset().mockResolvedValue({});
    mocks.venueSheet.length = 0;
});

afterEach(cleanup);

describe('SettingsTab', () => {
    it('shows the details with a pencil per part and the venue prompt', () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        expect(screen.getByText('Eleni & Nikos')).toBeTruthy();
        expect(screen.getByText('Agiou Nikolaou 4')).toBeTruthy();
        for (const label of [labels.title, labels.startAt, labels.locationName, tSettings.fields.description]) {
            expect(screen.getByRole('button', { name: editNamed(label) })).toBeTruthy();
        }
        // No cover yet: the empty box adds one.
        expect(screen.getByRole('button', { name: tSettings.coverPhoto.upload })).toBeTruthy();
        expect(screen.getByRole('button', { name: venue.venueAdd })).toBeTruthy();
    });

    it('saves only the title from the title editor and closes it', async () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        fireEvent.click(screen.getByRole('button', { name: editNamed(labels.title) }));
        const dialog = await screen.findByRole('dialog');
        const input = dialog.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Maria & Nikos' } });
        fireEvent.click(screen.getByRole('button', { name: tSettings.save }));

        await waitFor(() => expect(mocks.updateEvent).toHaveBeenCalledWith({ title: 'Maria & Nikos' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('saves only the changed location field', async () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        fireEvent.click(screen.getByRole('button', { name: editNamed(labels.locationName) }));
        const dialog = await screen.findByRole('dialog');
        const [name] = Array.from(dialog.querySelectorAll('input'));
        fireEvent.change(name, { target: { value: 'Ktima Lena' } });
        fireEvent.click(screen.getByRole('button', { name: tSettings.save }));

        await waitFor(() => expect(mocks.updateEvent).toHaveBeenCalledWith({ locationName: 'Ktima Lena' }));
    });

    it('keeps Save off until something changes', async () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        fireEvent.click(screen.getByRole('button', { name: editNamed(tSettings.fields.description) }));
        await screen.findByRole('dialog');

        expect((screen.getByRole('button', { name: tSettings.save }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('opens the editor as a panel beside the preview on desktop', () => {
        mocks.isDesktop = true;
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        expect(screen.queryByRole('heading', { name: labels.startAt })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: editNamed(labels.startAt) }));

        expect(screen.getByRole('heading', { name: labels.startAt })).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: messages.ManagePage.rsvpReport.close }));
        expect(screen.queryByRole('heading', { name: labels.startAt })).toBeNull();
    });

    it('shows the venue with its own pencil once added', () => {
        mocks.sessions = [storySession(), storySession({ id: 'ses-party', title: 'Reception', isMain: false, isSecondary: true, locationName: 'Ktima Lena' })];
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        expect(screen.queryByRole('button', { name: venue.venueAdd })).toBeNull();
        expect(screen.getByText('Reception')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: venue.venueEdit }));
        expect(screen.getByText('venue sheet')).toBeTruthy();
        expect(mocks.venueSheet.at(-1)?.editingSession).toMatchObject({ id: 'ses-party' });
    });

    it('opens the venue sheet as a new secondary session from the prompt', () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite />);

        fireEvent.click(screen.getByRole('button', { name: venue.venueAdd }));
        expect(screen.getByText('venue sheet')).toBeTruthy();
        expect(mocks.venueSheet.at(-1)).toMatchObject({ editingSession: null, secondaryPrefillTitle: messages.CreateEventPage.secondarySessions.WEDDING.title });
    });

    it('has no venue for event types without one', () => {
        renderTab(<SettingsTab event={weddingEvent({ eventType: 'BIRTHDAY' })} canWrite />);

        expect(screen.queryByRole('button', { name: venue.venueAdd })).toBeNull();
    });

    it('keeps only cover, title and description on a lite event', () => {
        renderTab(<SettingsTab event={weddingEvent({ eventType: 'BIRTHDAY', capabilities: LITE })} canWrite />);

        expect(screen.queryByRole('button', { name: editNamed(messages.CreateEventPage.fieldLabels.BIRTHDAY.startAt) })).toBeNull();
        expect(screen.queryByText('Agiou Nikolaou 4')).toBeNull();
        expect(screen.getByRole('button', { name: editNamed(tSettings.fields.description) })).toBeTruthy();
    });

    it('shows no pencils on a read-only event', () => {
        renderTab(<SettingsTab event={weddingEvent()} canWrite={false} />);

        expect(screen.getByText(tSettings.readOnly)).toBeTruthy();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
