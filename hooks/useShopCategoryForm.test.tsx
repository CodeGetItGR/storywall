import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useShopCategoryForm } from '@/hooks/useShopCategoryForm';
import type { AdminShopCategoryDto } from '@/lib/api/types';

const hooks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), setCollections: vi.fn(), remove: vi.fn() }));

vi.mock('@/hooks/useAdminShopCategories', () => ({
    useCreateShopCategory: () => ({ mutateAsync: hooks.create, isPending: false }),
    usePatchShopCategory: () => ({ mutateAsync: hooks.patch, isPending: false }),
    useSetShopCategoryCollections: () => ({ mutateAsync: hooks.setCollections, isPending: false }),
    useDeleteShopCategory: () => ({ mutateAsync: hooks.remove, isPending: false }),
}));

const WEDDING = { gid: 'gid://shopify/Collection/1', handle: 'wedding', title: 'Wedding invitations' };
const BAPTISM = { gid: 'gid://shopify/Collection/2', handle: 'baptism', title: 'Baptism invitations' };

const CATEGORY: AdminShopCategoryDto = {
    id: 'c1',
    name: { en: 'Invitations', el: 'Προσκλητήρια' },
    slug: 'invitations',
    sortOrder: 3,
    isVisible: true,
    collections: [{ storeId: 's1', collectionGid: WEDDING.gid, collectionTitle: WEDDING.title }],
};

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset();
    hooks.create.mockResolvedValue({ ...CATEGORY, id: 'new-id', collections: [] });
    hooks.patch.mockResolvedValue(CATEGORY);
    hooks.setCollections.mockResolvedValue(CATEGORY);
    hooks.remove.mockResolvedValue(undefined);
});

function fillNew(result: { current: ReturnType<typeof useShopCategoryForm> }) {
    act(() => result.current.setField('nameEn', ' Invitations '));
    act(() => result.current.setField('nameEl', 'Προσκλητήρια'));
    act(() => result.current.setField('slug', 'Wedding Invitations'));
}

describe('useShopCategoryForm(null)', () => {
    it('needs both names and a slug', () => {
        const { result } = renderHook(() => useShopCategoryForm(null, 4, vi.fn()));
        expect(result.current.canSave).toBe(false);
        act(() => result.current.setField('nameEn', 'Invitations'));
        act(() => result.current.setField('slug', 'invitations'));
        expect(result.current.canSave).toBe(false);
        act(() => result.current.setField('nameEl', '   '));
        expect(result.current.canSave).toBe(false);
        act(() => result.current.setField('nameEl', 'Προσκλητήρια'));
        expect(result.current.canSave).toBe(true);
    });

    it('rejects an order outside 0 to 1000', () => {
        const { result } = renderHook(() => useShopCategoryForm(null, 4, vi.fn()));
        fillNew(result);
        act(() => result.current.setField('sortOrder', '1001'));
        expect(result.current.sortOrderInvalid).toBe(true);
        expect(result.current.canSave).toBe(false);
    });

    it('creates the category, then sets the checked collections', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopCategoryForm(null, 4, onDone));
        fillNew(result);
        act(() => result.current.toggleCollection('s1', WEDDING));

        await act(() => result.current.submit());

        expect(hooks.create).toHaveBeenCalledWith({
            name: { en: 'Invitations', el: 'Προσκλητήρια' },
            slug: 'wedding-invitations',
            sortOrder: 4,
            isVisible: false,
        });
        expect(hooks.setCollections).toHaveBeenCalledWith({
            id: 'new-id',
            input: { collections: [{ storeId: 's1', collectionGid: WEDDING.gid, collectionTitle: WEDDING.title }] },
        });
        expect(onDone).toHaveBeenCalled();
    });

    it('skips the collections call when none are checked', async () => {
        const { result } = renderHook(() => useShopCategoryForm(null, 0, vi.fn()));
        fillNew(result);

        await act(() => result.current.submit());

        expect(hooks.create).toHaveBeenCalled();
        expect(hooks.setCollections).not.toHaveBeenCalled();
    });

    it('does not create twice when the collections call fails and the admin retries', async () => {
        hooks.setCollections.mockRejectedValueOnce(new Error('nope'));
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopCategoryForm(null, 0, onDone));
        fillNew(result);
        act(() => result.current.toggleCollection('s1', WEDDING));

        await act(() => result.current.submit());
        expect(onDone).not.toHaveBeenCalled();
        expect(result.current.error).toBeInstanceOf(Error);

        await act(() => result.current.submit());
        expect(hooks.create).toHaveBeenCalledTimes(1);
        expect(hooks.setCollections).toHaveBeenCalledTimes(2);
        expect(onDone).toHaveBeenCalled();
    });
});

describe('useShopCategoryForm(category)', () => {
    it('starts from the saved values with the mapped collections checked', () => {
        const { result } = renderHook(() => useShopCategoryForm(CATEGORY, 0, vi.fn()));
        expect(result.current.form.sortOrder).toBe('3');
        expect(result.current.isSelected('s1', WEDDING.gid)).toBe(true);
        expect(result.current.selectionDirty).toBe(false);
    });

    it('marks the selection dirty when a collection is toggled, and clean again when toggled back', () => {
        const { result } = renderHook(() => useShopCategoryForm(CATEGORY, 0, vi.fn()));
        act(() => result.current.toggleCollection('s1', BAPTISM));
        expect(result.current.selectionDirty).toBe(true);
        expect(result.current.selectedCountFor('s1')).toBe(2);
        act(() => result.current.toggleCollection('s1', BAPTISM));
        expect(result.current.selectionDirty).toBe(false);
    });

    it('sends only changed fields and no PUT when the selection is unchanged', async () => {
        const { result } = renderHook(() => useShopCategoryForm(CATEGORY, 0, vi.fn()));
        act(() => result.current.setField('nameEl', 'Προσκλήσεις'));

        await act(() => result.current.submit());

        expect(hooks.patch).toHaveBeenCalledWith({ id: 'c1', input: { name: { en: 'Invitations', el: 'Προσκλήσεις' } } });
        expect(hooks.setCollections).not.toHaveBeenCalled();
    });

    it('sends only the PUT when only the selection changed', async () => {
        const { result } = renderHook(() => useShopCategoryForm(CATEGORY, 0, vi.fn()));
        act(() => result.current.toggleCollection('s1', WEDDING));

        await act(() => result.current.submit());

        expect(hooks.patch).not.toHaveBeenCalled();
        expect(hooks.setCollections).toHaveBeenCalledWith({ id: 'c1', input: { collections: [] } });
    });

    it('stops adding collections at 50', () => {
        const many = Array.from({ length: 50 }, (_, index) => ({
            storeId: 's1',
            collectionGid: `gid://shopify/Collection/${index + 100}`,
            collectionTitle: `C${index}`,
        }));
        const { result } = renderHook(() => useShopCategoryForm({ ...CATEGORY, collections: many }, 0, vi.fn()));
        expect(result.current.atCollectionLimit).toBe(true);
        act(() => result.current.toggleCollection('s1', BAPTISM));
        expect(result.current.isSelected('s1', BAPTISM.gid)).toBe(false);
    });

    it('deletes only after the confirmation', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useShopCategoryForm(CATEGORY, 0, onDone));
        act(() => result.current.openDelete());
        expect(hooks.remove).not.toHaveBeenCalled();

        await act(() => result.current.confirmDeletion());

        expect(hooks.remove).toHaveBeenCalledWith('c1');
        expect(onDone).toHaveBeenCalled();
    });
});
