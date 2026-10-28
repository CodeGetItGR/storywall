import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhonesPanel } from '@/components/admin/phones/PhonesPanel';
import type { AdminDeviceDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({
    create: vi.fn(),
    reset: vi.fn(),
    revoke: vi.fn(),
    refresh: vi.fn(),
    devices: [] as AdminDeviceDto[],
}));

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
// A closed drawer keeps its children in the DOM, hidden, so a test can tell whether the code was dropped.
// Like the real drawer, it reports onClosed when a drawer that was open closes, never for one that was not open.
vi.mock('@/components/admin/AdminDrawer', async () => {
    const { useEffect, useRef } = await import('react');
    function AdminDrawer({
        open,
        onClosed,
        title,
        children,
        footer,
    }: {
        open: boolean;
        onClosed?: () => void;
        title: ReactNode;
        children: ReactNode;
        footer: ReactNode;
    }) {
        const wasOpen = useRef(open);
        useEffect(() => {
            if (wasOpen.current && !open) onClosed?.();
            wasOpen.current = open;
        }, [open, onClosed]);

        return (
            <div hidden={!open}>
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        );
    }
    return { AdminDrawer };
});
vi.mock('@/components/ui/ConfirmActionModal', () => ({ ConfirmActionModal: () => null }));
vi.mock('@/hooks/useAdminDevices', () => ({
    useAdminDevices: () => ({ data: hooks.devices, isLoading: false, error: null }),
    useRefreshAdminDevices: () => hooks.refresh,
    useCreateAdminDevice: () => ({ mutateAsync: hooks.create, reset: hooks.reset, isPending: false }),
    useRevokeAdminDevice: () => ({ mutateAsync: hooks.revoke, isPending: false }),
}));

const galaxy: AdminDeviceDto = { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: false };
const pixel: AdminDeviceDto = { id: 'd2', name: 'Pixel', createdAt: '2026-10-28T09:00:00Z', lastSeenAt: '2026-10-28T10:00:00Z', pushEnabled: true };

beforeEach(() => {
    hooks.devices = [galaxy, pixel];
    hooks.reset.mockReset();
    hooks.refresh.mockReset();
    hooks.create.mockReset().mockResolvedValue({ device: { ...galaxy, id: 'd3', name: 'Fold' }, key: 'secret-key' });
});
afterEach(cleanup);

function nameBox() {
    return screen.getByRole('textbox', { name: 'phones.fields.name' });
}

describe('PhonesPanel', () => {
    it('drops the pairing code when the create drawer closes, and reopens empty', async () => {
        render(<PhonesPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'phones.add' }));
        fireEvent.change(nameBox(), { target: { value: 'Fold' } });
        fireEvent.click(screen.getByRole('button', { name: 'phones.create' }));
        expect(await screen.findByRole('img', { name: 'qrLabel:Fold' })).toBeInTheDocument();
        // The finished mutation is detached, so React Query keeps no copy of the key.
        expect(hooks.reset).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'phones.done' }));

        // Hidden elements count here: the drawer must be empty, not just out of sight.
        await waitFor(() => expect(screen.queryByRole('img', { hidden: true })).toBeNull());
        expect(hooks.refresh).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole('button', { name: 'phones.add' }));
        expect(nameBox()).toHaveValue('');
        expect(screen.queryByRole('img', { hidden: true })).toBeNull();
    });

    it('opens the details of the phone whose button was clicked', () => {
        render(<PhonesPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'open:Pixel' }));

        expect(screen.getByRole('heading', { name: 'Pixel' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Galaxy' })).toBeNull();
    });

    it('closes the details when the phone is removed elsewhere', () => {
        const { rerender } = render(<PhonesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'open:Pixel' }));
        expect(screen.getByRole('heading', { name: 'Pixel' })).toBeInTheDocument();

        hooks.devices = [galaxy];
        rerender(<PhonesPanel />);

        expect(screen.queryByRole('heading', { name: 'Pixel' })).toBeNull();
    });
});
