import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OutreachRequestsSection } from '@/components/admin/outreach/requests/OutreachRequestsSection';
import type { OutreachRequestDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ decide: vi.fn(), role: 'ADMIN', status: [] as (string | null)[] }));

const REQUEST: OutreachRequestDto = {
    id: 'r1',
    kind: 'REMOVE',
    status: 'PENDING',
    prospectId: 'p1',
    prospectName: 'Ktima Gone',
    proposal: null,
    note: 'Closed down',
    requestedBy: 'Maria',
    requestedAt: '2026-10-30T10:00:00Z',
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
};

// Keys come back as-is.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error-message' }));
vi.mock('@/hooks/useOutreachFormat', () => ({ useOutreachFormat: () => ({ dateTime: (v: string) => v, city: (v: string) => v }) }));
vi.mock('@/components/admin/AdminNavigationContext', () => ({ useAdminNavigation: () => ({ role: hooks.role }) }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        body,
        confirmLabel,
        onConfirmAction,
    }: {
        open: boolean;
        title: string;
        body: ReactNode;
        confirmLabel: string;
        onConfirmAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                {body}
                <button type="button" onClick={onConfirmAction}>
                    {`confirm-${confirmLabel}`}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminOutreachRequests', () => ({
    useOutreachRequests: (status: string | null) => {
        hooks.status.push(status);
        return { data: { content: [REQUEST] }, isLoading: false, error: null };
    },
    useDecideOutreachRequest: () => ({ mutateAsync: hooks.decide, isPending: false }),
}));

describe('OutreachRequestsSection', () => {
    beforeEach(() => {
        hooks.decide.mockReset();
        hooks.role = 'ADMIN';
        hooks.status = [];
    });
    afterEach(cleanup);

    it('shows what is asked, by whom and why, waiting ones first', () => {
        render(<OutreachRequestsSection />);

        expect(screen.getByText('Ktima Gone')).toBeTruthy();
        expect(screen.getByText('Closed down')).toBeTruthy();
        expect(hooks.status[0]).toBe('PENDING');
    });

    it('lets an admin approve with a note', async () => {
        hooks.decide.mockResolvedValue({ ...REQUEST, status: 'APPROVED' });
        render(<OutreachRequestsSection />);

        fireEvent.click(screen.getByRole('button', { name: 'approve' }));
        const dialog = screen.getByRole('dialog', { name: 'approveTitle.REMOVE' });
        fireEvent.change(dialog.querySelector('textarea')!, { target: { value: 'Agreed' } });
        fireEvent.click(screen.getByRole('button', { name: 'confirm-approve' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(hooks.decide).toHaveBeenCalledWith({ id: 'r1', decision: 'approve', note: 'Agreed' });
    });

    it('shows the refusal when someone already decided it', async () => {
        hooks.decide.mockRejectedValueOnce(new Error('decided'));
        render(<OutreachRequestsSection />);

        fireEvent.click(screen.getByRole('button', { name: 'decline' }));
        fireEvent.click(screen.getByRole('button', { name: 'confirm-decline' }));

        expect(await screen.findByRole('alert')).toBeTruthy();
    });

    it('gives marketing no decision buttons', () => {
        hooks.role = 'MARKETING';
        render(<OutreachRequestsSection />);

        expect(screen.queryByRole('button', { name: 'approve' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'decline' })).toBeNull();
        expect(screen.getByText('introMarketing')).toBeTruthy();
    });
});
