import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useShopStoreForm } from '@/hooks/useShopStoreForm';
import type { AdminShopStoreDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), remove: vi.fn(), sync: vi.fn() }));

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
    hooks.patch.mockResolvedValue(STORE);
    hooks.remove.mockResolvedValue(undefined);
    hooks.sync.mockResolvedValue(undefined);
});

describe('useShopStoreForm(null)', () => {
    it('can save only once name, slug, domain, client ID and secret are filled', () => {
        const { result } = renderHook(() => useShopStoreForm(null, vi.fn()));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.setField('name', 'Inviart'));
        act(() => result.current.setField('slug', 'inviart'));
        act(() => result.current.setField('shopDomain', 'inviart.myshopify.com'));
        act(() => result.current.setField('clientId', 'cid'));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.setField('clientSecret', 's3cret'));
        expect(result.current.canSave).toBe(true);
    });

    it('lower-cases the slug and turns spaces into dashes', () => {
        const { result } = renderHook(() => useShopStoreForm(null, vi.fn()));
        act(() => result.current.setField('slug', 'My Store'));
        expect(result.current.form.slug).toBe('my-store');
    });

    it('lower-cases the domain and rejects one that is not a myshopify.com address', () => {
        const { result } = renderHook(() => useShopStoreForm(null, vi.fn()));
        act(() => result.current.setField('shopDomain', 'Inviart.gr'));
        expect(result.current.form.shopDomain).toBe('inviart.gr');
        expect(result.current.domainInvalid).toBe(true);

        act(() => result.current.setField('shopDomain', ' Inviart.MyShopify.com '));
        expect(result.current.domainInvalid).toBe(false);
    });

    it('creates the store hidden by default, then closes', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopStoreForm(null, onDone));
        act(() => result.current.setField('name', ' Inviart '));
        act(() => result.current.setField('slug', 'inviart'));
        act(() => result.current.setField('shopDomain', 'inviart.myshopify.com '));
        act(() => result.current.setField('clientId', 'cid'));
        act(() => result.current.setField('clientSecret', 's3cret'));

        await act(() => result.current.submit());

        expect(hooks.create).toHaveBeenCalledWith({
            name: 'Inviart',
            slug: 'inviart',
            shopDomain: 'inviart.myshopify.com',
            clientId: 'cid',
            clientSecret: 's3cret',
            isVisible: false,
        });
        expect(onDone).toHaveBeenCalled();
    });

    it('keeps the drawer open and exposes the error when the create fails', async () => {
        const onDone = vi.fn();
        const failure = new Error('nope');
        hooks.create.mockRejectedValue(failure);
        const { result } = renderHook(() => useShopStoreForm(null, onDone));
        act(() => result.current.setField('name', 'Inviart'));
        act(() => result.current.setField('slug', 'inviart'));
        act(() => result.current.setField('shopDomain', 'inviart.myshopify.com'));
        act(() => result.current.setField('clientId', 'cid'));
        act(() => result.current.setField('clientSecret', 's3cret'));

        await act(() => result.current.submit());

        expect(result.current.error).toBe(failure);
        expect(onDone).not.toHaveBeenCalled();
    });
});

describe('useShopStoreForm(store)', () => {
    it('can save without a secret', () => {
        const { result } = renderHook(() => useShopStoreForm(STORE, vi.fn()));
        expect(result.current.form.clientSecret).toBe('');
        expect(result.current.canSave).toBe(true);
    });

    it('sends only the changed fields and leaves an empty secret out', async () => {
        const { result } = renderHook(() => useShopStoreForm(STORE, vi.fn()));
        act(() => result.current.setField('name', 'Inviart Shop'));
        act(() => result.current.setVisible(false));

        await act(() => result.current.submit());

        expect(hooks.patch).toHaveBeenCalledWith({ id: 's1', input: { name: 'Inviart Shop', isVisible: false } });
    });

    it('sends a new secret when one is typed', async () => {
        const { result } = renderHook(() => useShopStoreForm(STORE, vi.fn()));
        act(() => result.current.setField('clientSecret', 'new-secret'));

        await act(() => result.current.submit());

        expect(hooks.patch).toHaveBeenCalledWith({ id: 's1', input: { clientSecret: 'new-secret' } });
    });

    it('closes without a request when nothing changed', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopStoreForm(STORE, onDone));

        await act(() => result.current.submit());

        expect(hooks.patch).not.toHaveBeenCalled();
        expect(onDone).toHaveBeenCalled();
    });

    it('starts a sync and says so', async () => {
        const { result } = renderHook(() => useShopStoreForm(STORE, vi.fn()));

        await act(() => result.current.syncNow());

        expect(hooks.sync).toHaveBeenCalledWith('s1');
        expect(result.current.syncStarted).toBe(true);
    });

    it('deletes only after the confirmation', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopStoreForm(STORE, onDone));
        act(() => result.current.openDelete());
        expect(result.current.confirmDelete).toBe(true);
        expect(hooks.remove).not.toHaveBeenCalled();

        await act(() => result.current.confirmDeletion());

        expect(hooks.remove).toHaveBeenCalledWith('s1');
        expect(onDone).toHaveBeenCalled();
    });
});
