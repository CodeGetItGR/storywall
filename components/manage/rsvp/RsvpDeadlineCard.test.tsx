import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpDeadlineCard } from '@/components/manage/rsvp/RsvpDeadlineCard';
import messages from '@/messages/en.json';

vi.mock('@/components/manage/rsvp/RsvpDeadlineSheet', () => ({
    RsvpDeadlineSheet: ({ open }: { open: boolean }) => (open ? <div>deadline sheet</div> : null),
}));

afterEach(cleanup);

const t = messages.ManagePage.rsvpStats;

function renderWithIntl(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

describe('RsvpDeadlineCard', () => {
    it('shows the deadline countdown and opens the sheet from the pencil', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline="2999-08-30T00:00:00Z" startAt="2999-09-20T16:00:00Z" timeZone="UTC" canWrite />);

        expect(screen.getByText(t.deadlineLabel)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: t.editDeadline }));
        expect(screen.getByText('deadline sheet')).toBeTruthy();
    });

    it('falls back to the event date when no deadline is set', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline={null} startAt="2999-09-20T16:00:00Z" timeZone="UTC" canWrite />);

        expect(screen.getByText(t.eventDateLabel)).toBeTruthy();
        expect(screen.getByRole('button', { name: t.editDeadline })).toBeTruthy();
    });

    it('has no pencil once the event can no longer change', () => {
        renderWithIntl(<RsvpDeadlineCard eventId="e1" rsvpDeadline={null} startAt="2999-09-20T16:00:00Z" timeZone="UTC" canWrite={false} />);

        expect(screen.queryByRole('button', { name: t.editDeadline })).toBeNull();
    });
});
