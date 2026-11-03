import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShopCategoryDrawer } from '@/components/admin/shop/ShopCategoryDrawer';
import type { AdminShopCategoryDto, AdminShopStoreDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), setCollections: vi.fn(), remove: vi.fn(), collections: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/hooks/useLocalizedText', () => ({ useLocalizedText: () => (text: { en?: string }) => text.en ?? '' }));
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
vi.mock('@/hooks/useAdminShopCategories', () => ({
    useCreateShopCategory: () => ({ mutateAsync: hooks.create, isPending: false }),
    usePatchShopCategory: () => ({ mutateAsync: hooks.patch, isPending: false }),
    useSetShopCategoryCollections: () => ({ mutateAsync: hooks.setCollections, isPending: false }),
    useDeleteShopCategory: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));
vi.mock('@/hooks/useAdminShopStores', () => ({
    useShopStoreCollections: (storeId: string | null) => hooks.collections(storeId),
}));

const STORES = [{ id: 's1', name: 'Inviart' }] as AdminShopStoreDto[];
const CATEGORY: AdminShopCategoryDto = {
    id: 'c1',
    name: { en: 'Invitations', el: 'Προσκλητήρια' },
    slug: 'invitations',
    sortOrder: 0,
    isVisible: true,
    collections: [],
};

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset();
    hooks.collections.mockImplementation((storeId: string | null) => ({
        data: storeId ? [{ gid: 'gid://shopify/Collection/1', handle: 'wedding', title: 'Wedding invitations' }] : undefined,
        isLoading: false,
        error: null,
    }));
    hooks.setCollections.mockResolvedValue(CATEGORY);
    hooks.remove.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('ShopCategoryDrawer', () => {
    it('blocks Save until both names and the slug are filled', () => {
        render(<ShopCategoryDrawer category={null} stores={STORES} defaultSortOrder={0} onCloseAction={vi.fn()} />);
        const save = screen.getByRole('button', { name: 'save' });
        expect(save).toBeDisabled();

        fireEvent.change(screen.getByLabelText('categories.nameEn'), { target: { value: 'Invitations' } });
        fireEvent.change(screen.getByLabelText('categories.slug'), { target: { value: 'invitations' } });
        expect(save).toBeDisabled();

        fireEvent.change(screen.getByLabelText('categories.nameEl'), { target: { value: 'Προσκλητήρια' } });
        expect(save).toBeEnabled();
    });

    it("loads a store's collections only when its group is opened, and saves the checked ones", async () => {
        render(<ShopCategoryDrawer category={CATEGORY} stores={STORES} defaultSortOrder={0} onCloseAction={vi.fn()} />);
        expect(hooks.collections).not.toHaveBeenCalledWith('s1');

        fireEvent.click(screen.getByRole('button', { name: /Inviart/ }));
        expect(hooks.collections).toHaveBeenCalledWith('s1');
        fireEvent.click(screen.getByRole('checkbox', { name: /Wedding invitations/ }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await waitFor(() =>
            expect(hooks.setCollections).toHaveBeenCalledWith({
                id: 'c1',
                input: { collections: [{ storeId: 's1', collectionGid: 'gid://shopify/Collection/1', collectionTitle: 'Wedding invitations' }] },
            }),
        );
    });

    it('asks before deleting and only the confirm button deletes', async () => {
        const onClose = vi.fn();
        render(<ShopCategoryDrawer category={CATEGORY} stores={STORES} defaultSortOrder={0} onCloseAction={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'categories.delete' }));
        expect(screen.getByRole('dialog', { name: 'categories.deleteTitle:Invitations' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'dialog-cancel' }));
        expect(hooks.remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'categories.delete' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'categories.delete' }).at(-1)!);
        await waitFor(() => expect(hooks.remove).toHaveBeenCalledWith('c1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
