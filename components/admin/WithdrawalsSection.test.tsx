import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WithdrawalsSection } from '@/components/admin/WithdrawalsSection';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const row: WithdrawalAdminDto = {
    request: {
        id: 'w-1',
        eventId: 'e-1',
        scope: 'EVENT',
        orderId: 'o-1',
        status: 'REFUNDED',
        reason: null,
        createdAt: '2026-09-28T10:00:00Z',
        decidedAt: '2026-09-29T10:00:00Z',
        decisionNote: null,
        holdUntil: null,
        totalRefundMinor: 4900,
        currency: 'EUR',
        refusals: [],
        lines: [],
        excludedOrders: [],
    },
    usageFacts: null,
    fraudSignals: [],
    recommendation: '',
};

// BackButton steps back through the router when the previous page is in the app.
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));

vi.mock('@/hooks/useAdmin', () => ({
    useAdminWithdrawals: () => ({ data: [row], isLoading: false, isFetching: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/components/admin/AdminNavigationContext', () => ({
    useAdminNavigation: () => ({ sendTo: vi.fn() }),
}));

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

function renderSection() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <WithdrawalsSection />
        </NextIntlClientProvider>,
    );
}

describe('WithdrawalsSection', () => {
    it('returns to the list when Back is clicked on a request page', () => {
        window.history.replaceState(null, '', '/admin#withdrawals/w-1');
        renderSection();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('link', { name: messages.AdminPage.withdrawals.title }));

        expect(window.location.hash).toBe('#withdrawals');
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: messages.AdminPage.withdrawals.title })).toBeInTheDocument();
    });
});
