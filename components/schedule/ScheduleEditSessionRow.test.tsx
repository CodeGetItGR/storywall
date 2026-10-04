import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScheduleEditSessionRow } from '@/components/schedule/ScheduleEditSessionRow';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { getManagedSessionDefinitions } from '@/lib/sessionManagement';
import messages from '@/messages/en.json';

// TargetedSection reads ?section= to highlight a row; none is targeted here.
vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/events/event-1/tools/schedule',
    useRouter: () => ({ replace: vi.fn() }),
}));

const [mainDefinition, secondaryDefinition] = getManagedSessionDefinitions('WEDDING');

function aSession(overrides: Partial<EventSessionResponseDto>): EventSessionResponseDto {
    return {
        id: 'session-1',
        eventId: 'event-1',
        title: 'Ceremony',
        description: null,
        startAt: '2027-08-07T16:30:00Z',
        endAt: '2027-08-08T17:00:00Z',
        locationName: null,
        mapsUrl: null,
        displayOrder: 0,
        isMain: false,
        isSecondary: false,
        rsvpEnabled: false,
        createdAt: '2026-10-02T07:01:24Z',
        deletedAt: null,
        ...overrides,
    } as EventSessionResponseDto;
}

function renderRow(props: Partial<Parameters<typeof ScheduleEditSessionRow>[0]>) {
    const handlers = { onCreateManagedSession: vi.fn(), onEditSession: vi.fn(), onDeleteSession: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ScheduleEditSessionRow
                definition={null}
                session={null}
                canWrite
                canAddSession
                deleteDisabled={false}
                locale="en"
                {...handlers}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return handlers;
}

afterEach(cleanup);

describe('ScheduleEditSessionRow', () => {
    it('offers no delete for the main session', () => {
        renderRow({ definition: mainDefinition, session: aSession({ isMain: true }) });

        expect(screen.getByRole('button', { name: 'Edit Ceremony' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete Ceremony' })).not.toBeInTheDocument();
    });

    it('still offers delete for any other session', () => {
        renderRow({ session: aSession({ title: 'Afterparty' }) });

        expect(screen.getByRole('button', { name: 'Delete Afterparty' })).toBeInTheDocument();
    });

    it('lets a host restore a missing main session', () => {
        const { onCreateManagedSession } = renderRow({ definition: mainDefinition });

        expect(screen.getByText('No ceremony session yet. Add it to show it on the schedule.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Add Ceremony' }));
        expect(onCreateManagedSession).toHaveBeenCalledWith(mainDefinition);
    });

    it('keeps the venue copy for a missing secondary session', () => {
        renderRow({ definition: secondaryDefinition });

        expect(screen.getByText('No venue session has been added yet.')).toBeInTheDocument();
    });
});
