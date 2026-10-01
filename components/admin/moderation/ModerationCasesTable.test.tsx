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

function renderTable(cases: ModerationCaseSummaryDto[], showOutcome = false, onOpenAction = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <ModerationCasesTable cases={cases} showOutcome={showOutcome} onOpenAction={onOpenAction} />
        </NextIntlClientProvider>,
    );
    return onOpenAction;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ModerationCasesTable', () => {
    it('shows an open case and opens it by target', () => {
        const onOpen = renderTable([openCase]);

        expect(screen.getByText('Maria & Nikos')).toBeInTheDocument();
        expect(screen.getByText('Harassment')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        // The first report: the queue's order, and how long the case has waited.
        expect(screen.getByText('Sep 28, 2026')).toBeInTheDocument();
        expect(screen.queryByText('Outcome')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Open Comment report, Maria & Nikos' }));

        expect(onOpen).toHaveBeenCalledWith({ targetType: 'COMMENT', targetId: 'c-1' });
    });

    it('renders a closed case without reason, report dates or event', () => {
        renderTable([closedCase], true);

        expect(screen.getByText('Event deleted')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open Post report, Event deleted' })).toBeInTheDocument();
        expect(screen.getByText('Outcome')).toBeInTheDocument();
        expect(screen.getByText('Action taken')).toBeInTheDocument();
        expect(screen.getByText('Sep 29, 2026')).toBeInTheDocument();
    });

    it('keys closed rows by decision, so one item decided twice shows twice', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderTable([closedCase, { ...closedCase, decisionId: 'd-2', outcome: 'DISMISSED' }], true);

        const keyWarnings = consoleError.mock.calls.filter((args) => args.some((arg) => String(arg).includes('same key')));
        expect(keyWarnings).toEqual([]);
        expect(screen.getAllByRole('button', { name: 'Open Post report, Event deleted' })).toHaveLength(2);
        expect(screen.getByText('No action')).toBeInTheDocument();
    });
});
