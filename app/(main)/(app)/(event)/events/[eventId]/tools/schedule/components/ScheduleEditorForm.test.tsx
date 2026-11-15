import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';

import { ScheduleEditorForm } from './ScheduleEditorForm';

vi.mock('next-intl', () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => false }));
vi.mock('@/components/ui/modal', () => ({ Modal: { Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div> } }));

const ADDRESS = 'CreateEventPage.fields.locationAddress';

function session(overrides: Partial<EventSessionResponseDto> = {}): EventSessionResponseDto {
    return {
        id: 's2',
        eventId: 'e1',
        title: 'Reception',
        description: null,
        startAt: null,
        endAt: null,
        locationName: 'Villa',
        mapsUrl: null,
        locationAddress: '3 Garden Lane',
        displayOrder: 1,
        isMain: false,
        isSecondary: true,
        rsvpEnabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        deletedAt: null,
        ...overrides,
    };
}

function renderForm(editingSession: EventSessionResponseDto | null) {
    const createSession = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    const updateSession = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
    render(
        <ScheduleEditorForm
            eventId="e1"
            eventStatus="DRAFT"
            sessions={[]}
            editingSession={editingSession}
            defaultStartAt=""
            createSession={createSession}
            updateSession={updateSession}
            onClose={vi.fn()}
        />,
    );
    return { createSession, updateSession };
}

function addressInput(): HTMLInputElement {
    return screen.getByPlaceholderText('CreateEventPage.placeholders.locationAddress');
}

afterEach(cleanup);

describe('ScheduleEditorForm address', () => {
    it('shows the address field with the shared label and the session address', () => {
        renderForm(session());
        expect(screen.getByText(ADDRESS)).toBeTruthy();
        expect(addressInput().value).toBe('3 Garden Lane');
    });

    it('sends only a changed address when editing', async () => {
        const { updateSession } = renderForm(session());
        fireEvent.change(addressInput(), { target: { value: ' 4 Garden Lane ' } });
        fireEvent.submit(addressInput().closest('form')!);
        await vi.waitFor(() => expect(updateSession.mutateAsync).toHaveBeenCalledWith({ locationAddress: '4 Garden Lane' }));
    });

    it('sends an emptied address as empty text, so the backend clears it', async () => {
        const { updateSession } = renderForm(session());
        fireEvent.change(addressInput(), { target: { value: '' } });
        fireEvent.submit(addressInput().closest('form')!);
        await vi.waitFor(() => expect(updateSession.mutateAsync).toHaveBeenCalledWith({ locationAddress: '' }));
    });

    it('creates a session with its address', async () => {
        const { createSession } = renderForm(null);
        fireEvent.change(screen.getByPlaceholderText('SchedulePage.host.placeholders.title'), { target: { value: 'Party' } });
        fireEvent.change(addressInput(), { target: { value: '5 Beach Road' } });
        fireEvent.submit(addressInput().closest('form')!);
        await vi.waitFor(() =>
            expect(createSession.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ title: 'Party', locationAddress: '5 Beach Road' })),
        );
    });
});
