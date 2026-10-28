import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneDetailDrawer } from '@/components/admin/phones/PhoneDetailDrawer';
import type { AdminDeviceDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ revoke: vi.fn() }));

// Keys come back as-is, so the pill renders its bare key.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div data-testid="admin-drawer">
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        confirmLabel,
        onConfirmAction,
    }: {
        open: boolean;
        title: string;
        confirmLabel: string;
        onConfirmAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminDevices', () => ({
    useRevokeAdminDevice: () => ({ mutateAsync: hooks.revoke, isPending: false }),
}));

const device: AdminDeviceDto = { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: true };

beforeEach(() => {
    hooks.revoke.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('PhoneDetailDrawer', () => {
    it('removes the phone only after confirmation', async () => {
        const onClose = vi.fn();
        render(<PhoneDetailDrawer open device={device} onCloseAction={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.remove' }));
        expect(hooks.revoke).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'phones.removeConfirm' }));

        await waitFor(() => expect(hooks.revoke).toHaveBeenCalledWith('d1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('shows when the phone was never used', () => {
        render(<PhoneDetailDrawer open device={device} onCloseAction={vi.fn()} />);

        expect(screen.getByText('phones.never')).toBeInTheDocument();
        expect(screen.getByText('on')).toBeInTheDocument();
    });

    it('shows the error and stays open when removal fails', async () => {
        hooks.revoke.mockRejectedValue(new Error('x'));
        const onClose = vi.fn();
        render(<PhoneDetailDrawer open device={device} onCloseAction={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.remove' }));
        fireEvent.click(screen.getByRole('button', { name: 'phones.removeConfirm' }));

        // A plain Error maps to the generic message.
        expect(await screen.findByText('errors.generic')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
