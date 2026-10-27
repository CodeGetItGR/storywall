import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShopStoreDrawer } from '@/components/admin/shop/ShopStoreDrawer';
import type { AdminShopStoreDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), remove: vi.fn(), sync: vi.fn() }));

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
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
        onCloseAction,
    }: {
        open: boolean;
        title: string;
        confirmLabel: string;
        onConfirmAction: () => void;
        onCloseAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
                <button type="button" onClick={onCloseAction}>
                    dialog-cancel
                </button>
            </div>
        ) : null,
}));
vi.mock('@/hooks/useAdminShopStores', () => ({
    useCreateShopStore: () => ({ mutateAsync: hooks.create, isPending: false }),
    usePatchShopStore: () => ({ mutateAsync: hooks.patch, isPending: false }),
    useDeleteShopStore: () => ({ mutateAsync: hooks.remove, isPending: false }),
    useSyncShopStore: () => ({ mutateAsync: hooks.sync, isPending: false }),
}));

const STORE: AdminShopStoreDto = {
    id: 's1',
    name: 'Inviart',
    slug: 'inviart',
    shopDomain: 'inviart.myshopify.com',
    clientId: 'cid',
    isVisible: true,
    lastSyncedAt: '2026-10-27T10:00:00Z',
    lastSyncError: null,
    productCount: 12,
};

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset();
    hooks.create.mockResolvedValue(STORE);
    hooks.remove.mockResolvedValue(undefined);
    hooks.sync.mockResolvedValue(undefined);
});

afterEach(cleanup);

function type(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('ShopStoreDrawer', () => {
    it('blocks Save until the required fields are filled', () => {
        render(<ShopStoreDrawer store={null} onCloseAction={vi.fn()} />);
        const save = screen.getByRole('button', { name: 'save' });
        expect(save).toBeDisabled();

        type('stores.name', 'Inviart');
        type('stores.slug', 'inviart');
        type('stores.domain', 'inviart.myshopify.com');
        type('stores.clientId', 'cid');
        expect(save).toBeDisabled();

        type('stores.clientSecret', 's3cret');
        expect(save).toBeEnabled();
    });

    it('shows the secret as a password field', () => {
        render(<ShopStoreDrawer store={null} onCloseAction={vi.fn()} />);
        expect(screen.getByLabelText('stores.clientSecret')).toHaveAttribute('type', 'password');
    });

    it('locks slug and domain when editing and leaves the secret empty', () => {
        render(<ShopStoreDrawer store={STORE} onCloseAction={vi.fn()} />);
        expect(screen.getByLabelText('stores.slug')).toHaveAttribute('readonly');
        expect(screen.getByLabelText('stores.domain')).toHaveAttribute('readonly');
        expect(screen.getByLabelText('stores.clientSecret')).toHaveValue('');
        expect(screen.getByLabelText('stores.clientSecret')).toHaveAttribute('placeholder', 'stores.secretUnchanged');
    });

    it('says the sync started after Sync now', async () => {
        render(<ShopStoreDrawer store={STORE} onCloseAction={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'stores.syncNow' }));
        expect(await screen.findByText('stores.syncStarted')).toBeInTheDocument();
        expect(hooks.sync).toHaveBeenCalledWith('s1');
    });

    it('asks before removing and only the confirm button removes', async () => {
        const onClose = vi.fn();
        render(<ShopStoreDrawer store={STORE} onCloseAction={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'stores.remove' }));
        const dialog = screen.getByRole('dialog', { name: 'stores.removeTitle:Inviart' });
        expect(hooks.remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'dialog-cancel' }));
        expect(dialog).not.toBeInTheDocument();
        expect(hooks.remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'stores.remove' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'stores.remove' }).at(-1)!);
        await waitFor(() => expect(hooks.remove).toHaveBeenCalledWith('s1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
