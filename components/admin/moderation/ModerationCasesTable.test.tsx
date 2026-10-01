import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModerationCasesTable } from '@/components/admin/moderation/ModerationCasesTable';
import type { ModerationCaseSummaryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const openCase: ModerationCaseSummaryDto = {
    targetType: 'COMMENT',
    targetId: 'c-1',
    eventId: 'e-1',
    eventTitle: 'Maria & Nikos',
    reportCount: 3,
    topReason: 'HARASSMENT',
    firstReportedAt: '2026-09-28T10:00:00Z',
    lastReportedAt: '2026-09-30T10:00:00Z',
    status: 'OPEN',
    decisionId: null,
    outcome: null,
    decidedAt: null,
};

// CLOSED rows: no reason or report dates, and the event may be purged.
const closedCase: ModerationCaseSummaryDto = {
    ...openCase,
    targetType: 'POST',
    targetId: 'p-1',
    eventTitle: null,
    reportCount: 2,
    topReason: null,
    firstReportedAt: null,
    lastReportedAt: null,
    status: 'CLOSED',
    decisionId: 'd-1',
    outcome: 'ACTION_TAKEN',
    decidedAt: '2026-09-29T10:00:00Z',
};

function renderTable(cases: ModerationCaseSummaryDto[], onOpenAction = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <ModerationCasesTable cases={cases} onOpenAction={onOpenAction} />
        </NextIntlClientProvider>,
    );
    return onOpenAction;
}

afterEach(cleanup);

describe('ModerationCasesTable', () => {
    it('shows an open case and opens it by target', () => {
        const onOpen = renderTable([openCase]);

        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByText('Harassment')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Comment/ }));

        expect(onOpen).toHaveBeenCalledWith({ targetType: 'COMMENT', targetId: 'c-1' });
    });

    it('renders a closed case without reason, report dates or event', () => {
        renderTable([closedCase]);

        expect(screen.getByText('Event deleted')).toBeInTheDocument();
        expect(screen.getByText('Action taken')).toBeInTheDocument();
        expect(screen.getByText('Sep 29, 2026')).toBeInTheDocument();
    });

    it('keys closed rows by decision, so one item decided twice shows twice', () => {
        renderTable([closedCase, { ...closedCase, decisionId: 'd-2', outcome: 'DISMISSED' }]);

        expect(screen.getAllByRole('button', { name: /Post/ })).toHaveLength(2);
        expect(screen.getByText('No action')).toBeInTheDocument();
    });
});
