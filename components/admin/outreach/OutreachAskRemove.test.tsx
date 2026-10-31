import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OutreachAskRemove } from '@/components/admin/outreach/OutreachAskRemove';

const hooks = vi.hoisted(() => ({ send: vi.fn() }));

// Keys come back as-is.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error-message' }));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        body,
        confirmLabel,
        confirmDisabled,
        onConfirmAction,
    }: {
        open: boolean;
        title: string;
        body: ReactNode;
        confirmLabel: string;
        confirmDisabled?: boolean;
        onConfirmAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                {body}
                <button type="button" disabled={confirmDisabled} onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminOutreachRequests', () => ({
    useCreateOutreachRequest: () => ({ mutateAsync: hooks.send, isPending: false }),
}));

describe('OutreachAskRemove', () => {
    beforeEach(() => hooks.send.mockReset());
    afterEach(cleanup);

    it('needs a reason, then sends a removal request', async () => {
        hooks.send.mockResolvedValue({ id: 'r1' });
        render(<OutreachAskRemove prospectId="p1" />);

        fireEvent.click(screen.getByRole('button', { name: 'action' }));
        expect(screen.getByRole('button', { name: 'confirm' })).toHaveProperty('disabled', true);

        fireEvent.change(screen.getByRole('dialog').querySelector('textarea')!, { target: { value: ' Closed down ' } });
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

        await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
        expect(hooks.send).toHaveBeenCalledWith({ kind: 'REMOVE', prospectId: 'p1', note: 'Closed down' });
        expect(screen.queryByRole('button', { name: 'action' })).toBeNull();
    });

    it('shows the refusal when a request is already waiting', async () => {
        hooks.send.mockRejectedValueOnce(new Error('pending'));
        render(<OutreachAskRemove prospectId="p1" />);

        fireEvent.click(screen.getByRole('button', { name: 'action' }));
        fireEvent.change(screen.getByRole('dialog').querySelector('textarea')!, { target: { value: 'Closed' } });
        fireEvent.click(screen.getByRole('button', { name: 'confirm' }));

        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'action' })).toBeTruthy();
    });
});
