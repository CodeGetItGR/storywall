import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationRow } from '@/components/notifications/NotificationRow';
import type { NotificationResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useNotifications', () => ({
    useMarkNotificationRead: () => ({ mutate: vi.fn() }),
    useDeleteNotification: () => ({ mutate: vi.fn(), isPending: false }),
}));

// moderation-admin-fe-integration.md §6: SYSTEM/INFO, no CTA, title and body rendered by the server.
const reportOutcome: NotificationResponseDto = {
    id: 'n-1',
    recipientMemberId: 'm-1',
    eventId: 'e-1',
    eventTitle: 'Maria & Nikos',
    type: 'REPORT_OUTCOME',
    category: 'SYSTEM',
    severity: 'INFO',
    title: 'About your report',
    body: 'We reviewed your report in Maria & Nikos and took action under the Community Guidelines.',
    ctaLabel: null,
    ctaTarget: null,
    ctaParams: {},
    expiresAt: null,
    referenceType: null,
    referenceId: null,
    payload: { eventTitle: 'Maria & Nikos' },
    readAt: null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
};

function renderRow(notification: NotificationResponseDto) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <NotificationRow notification={notification} />
        </NextIntlClientProvider>,
    );
}

afterEach(() => {
    cleanup();
});

describe('NotificationRow', () => {
    it('renders REPORT_OUTCOME verbatim with no link or CTA', () => {
        renderRow(reportOutcome);

        expect(screen.getByText('About your report')).toBeInTheDocument();
        expect(screen.getByText(reportOutcome.body!)).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders an unknown type generically instead of dropping it', () => {
        renderRow({ ...reportOutcome, id: 'n-2', type: 'SOMETHING_NEW', category: null, severity: null, title: null, body: null, payload: {} });

        expect(screen.getByText(messages.NotificationsPage.generic.title)).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('fills the VENDOR_JOINED fallback with the business and the type', () => {
        renderRow({
            ...reportOutcome,
            id: 'n-3',
            type: 'VENDOR_JOINED',
            category: null,
            severity: null,
            title: null,
            body: null,
            ctaTarget: 'EVENT_VENDORS',
            ctaParams: { eventId: 'e-1' },
            payload: { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER' },
        });

        expect(screen.getByText('Studio X joined as Photographer')).toBeInTheDocument();
    });

    it('fills the PRINT_PICKS_ENDING fallback with the date and a singular or plural body', () => {
        const ending: NotificationResponseDto = {
            ...reportOutcome,
            type: 'PRINT_PICKS_ENDING',
            category: null,
            severity: null,
            title: null,
            body: null,
            ctaTarget: 'EVENT_VENDOR_PAGE',
            ctaParams: { eventId: 'e-1' },
        };

        renderRow({ ...ending, id: 'n-4', payload: { count: 1, closesDate: '12 Jul 2027', closesAt: '2027-07-12T21:00:00Z' } });
        expect(screen.getByText('Print picks close on 12 Jul 2027 (Athens time)')).toBeInTheDocument();
        expect(screen.getByText('Download the photo the host picked.')).toBeInTheDocument();
        cleanup();

        renderRow({ ...ending, id: 'n-5', payload: { count: 5, closesDate: '12 Jul 2027', closesAt: '2027-07-12T21:00:00Z' } });
        expect(screen.getByText('Download the 5 photos the host picked.')).toBeInTheDocument();
    });

    it('fills the PRINT_LIST_SENT fallback with the guest, count and total', () => {
        renderRow({
            ...reportOutcome,
            id: 'n-6',
            type: 'PRINT_LIST_SENT',
            category: null,
            severity: null,
            title: null,
            body: null,
            ctaTarget: 'EVENT_VENDOR_PAGE',
            ctaParams: { eventId: 'e-1' },
            payload: { count: 3, guestName: 'Maria', total: '€9.00' },
        });

        expect(screen.getByText('Maria sent a print list')).toBeInTheDocument();
        expect(screen.getByText('3 prints, €9.00.')).toBeInTheDocument();
    });
});
