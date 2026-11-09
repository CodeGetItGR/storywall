import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RsvpListPanel } from '@/components/manage/rsvp/RsvpListPanel';
import { rsvpKeys } from '@/hooks/useRsvps';
import { api, ApiError } from '@/lib/api/client';
import type { RsvpResponseDto } from '@/lib/api/types';
import type { RosterMember } from '@/lib/rsvpGuests';
import en from '@/messages/en.json';

vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { ...actual.api, del: vi.fn() } };
});

const t = en.ManagePage;
const EVENT_ID = 'event-1';

const members: RosterMember[] = [
    { id: 'anna', displayName: 'Anna', role: 'ATTENDEE', deletedAt: null },
    { id: 'host', displayName: 'Host', role: 'HOST', deletedAt: null },
];

function rsvp(overrides: Partial<RsvpResponseDto>): RsvpResponseDto {
    return {
        id: 'rsvp-anna',
        eventMemberId: 'anna',
        attendanceStatus: 'ATTENDING',
        phone: '6941234567',
        adultCount: 2,
        childCount: 0,
        notes: null,
        submittedAt: '2026-06-10T10:00:00Z',
        updatedAt: '2026-06-10T10:00:00Z',
        guestName: 'Anna',
        replyOnly: false,
        email: null,
        possibleDuplicate: false,
        ...overrides,
    };
}

const maria = rsvp({
    id: 'rsvp-maria',
    eventMemberId: 'maria',
    guestName: 'Maria',
    replyOnly: true,
    phone: '+30 694 123 4567',
    email: 'maria@example.com',
    possibleDuplicate: true,
});
const rsvps = [rsvp({}), maria];

let queryClient: QueryClient;

function renderPanel(canWrite = true) {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(rsvpKeys.list(EVENT_ID), rsvps);
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={en}>
                <RsvpListPanel eventId={EVENT_ID} members={members} rsvps={rsvps} canWrite={canWrite} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

// Rows render twice, as a phone list and a desktop table; jsdom shows both.
const phoneList = () => within(screen.getAllByRole('list')[0]);

beforeEach(() => {
    vi.mocked(api.del).mockReset();
});
afterEach(cleanup);

describe('RsvpListPanel', () => {
    it('lists a reply-only guest by the name they typed, with their phone and email, counted once', () => {
        renderPanel();

        expect(phoneList().getByText('Maria')).toBeTruthy();
        expect(phoneList().getByText('+30 694 123 4567 · maria@example.com')).toBeTruthy();
        expect(phoneList().getByText('Anna')).toBeTruthy();
        expect(phoneList().queryByText('Host')).toBeNull();
        // Both attending, two guests: the filter counts each person once.
        expect(screen.getByRole('option', { name: `${t.rsvpFilters.all} (2)` })).toBeTruthy();
        expect(screen.getByRole('option', { name: `${t.rsvpBreakdown.attending} (2)` })).toBeTruthy();
    });

    it('marks a possible duplicate and keeps it on the host’s say-so', async () => {
        vi.mocked(api.del).mockResolvedValue({ ...maria, possibleDuplicate: false });
        renderPanel();

        expect(phoneList().getByText(t.rsvpDuplicate.label)).toBeTruthy();
        expect(phoneList().getByText(t.rsvpDuplicate.label).getAttribute('title')).toBe(t.rsvpDuplicate.hint);
        fireEvent.click(phoneList().getByRole('button', { name: t.rsvpDuplicate.keep }));

        await waitFor(() => expect(api.del).toHaveBeenCalledWith('/api/rsvps/rsvp-maria/duplicate-mark'));
        await waitFor(() => expect(queryClient.getQueryData<RsvpResponseDto[]>(rsvpKeys.list(EVENT_ID))?.[1].possibleDuplicate).toBe(false));
    });

    it('removes a reply-only reply after a confirmation', async () => {
        vi.mocked(api.del).mockResolvedValue(undefined);
        renderPanel();

        fireEvent.click(phoneList().getByRole('button', { name: t.members.remove }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(t.rsvpDuplicate.removeTitle)).toBeTruthy();
        expect(within(dialog).getByText(t.rsvpDuplicate.removeBody.replace('{name}', 'Maria'))).toBeTruthy();
        expect(api.del).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: t.rsvpDuplicate.removeConfirm }));
        await waitFor(() => expect(api.del).toHaveBeenCalledWith('/api/rsvps/rsvp-maria'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('closes the confirmation without removing anything', async () => {
        renderPanel();
        fireEvent.click(phoneList().getByRole('button', { name: t.members.remove }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getAllByRole('button', { name: t.members.cancel }).at(-1) as HTMLElement);

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(api.del).not.toHaveBeenCalled();
    });

    it('says when keeping fails, with the shared copy for a server error', async () => {
        vi.mocked(api.del).mockRejectedValue(
            new ApiError(500, { type: 'about:blank', title: 'x', status: 500, detail: '', instance: '/', errorCode: 9001, errorKey: 'INTERNAL_ERROR' }),
        );
        renderPanel();
        fireEvent.click(phoneList().getByRole('button', { name: t.rsvpDuplicate.keep }));

        expect((await screen.findByRole('alert')).textContent).toBe(en.ApiErrors.internalError);
    });

    it('shows the mark without actions once the event can no longer change', () => {
        renderPanel(false);
        expect(phoneList().getByText(t.rsvpDuplicate.label)).toBeTruthy();
        expect(screen.queryByRole('button', { name: t.rsvpDuplicate.keep })).toBeNull();
        expect(screen.queryByRole('button', { name: t.members.remove })).toBeNull();
    });
});
