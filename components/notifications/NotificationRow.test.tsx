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
});
