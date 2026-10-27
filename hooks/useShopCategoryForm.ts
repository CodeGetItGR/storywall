'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateShopCategory, useDeleteShopCategory, usePatchShopCategory, useSetShopCategoryCollections } from '@/hooks/useAdminShopCategories';
import type { AdminShopCategoryDto, AdminShopCategoryMappingDto, AdminShopCategoryPatchDto } from '@/lib/api/types';
import { isShopSlugValid, normalizeShopSlug, SHOP_CATEGORY_COLLECTIONS_MAX, SHOP_SORT_ORDER_MAX, shopCollectionKey } from '@/lib/shopAdmin';

export type ShopCategoryField = 'nameEn' | 'nameEl' | 'slug' | 'sortOrder';
export type ShopCategoryForm = Record<ShopCategoryField, string> & { isVisible: boolean };
type Saved = { id: string; form: ShopCategoryForm; collections: AdminShopCategoryMappingDto[] };

const FIELDS: ReadonlySet<string> = new Set<ShopCategoryField>(['nameEn', 'nameEl', 'slug', 'sortOrder']);

function formOf(category: AdminShopCategoryDto): ShopCategoryForm {
    return {
        nameEn: category.name.en ?? '',
        nameEl: category.name.el ?? '',
        slug: category.slug,
        sortOrder: String(category.sortOrder),
        isVisible: category.isVisible,
    };
}

function parseSortOrder(value: string): number | null {
    if (!/^\d+$/.test(value.trim())) return null;
    const parsed = Number(value.trim());
    return parsed <= SHOP_SORT_ORDER_MAX ? parsed : null;
}

function keysOf(collections: AdminShopCategoryMappingDto[]): Set<string> {
    return new Set(collections.map((item) => shopCollectionKey(item.storeId, item.collectionGid)));
}

function sameSelection(left: AdminShopCategoryMappingDto[], right: AdminShopCategoryMappingDto[]): boolean {
    const rightKeys = keysOf(right);
    return left.length === right.length && left.every((item) => rightKeys.has(shopCollectionKey(item.storeId, item.collectionGid)));
}

// Only what changed; the slug can't change after create.
function patchOf(form: ShopCategoryForm, saved: ShopCategoryForm): AdminShopCategoryPatchDto {
    const input: AdminShopCategoryPatchDto = {};
    const nameEn = form.nameEn.trim();
    const nameEl = form.nameEl.trim();
    if (nameEn !== saved.nameEn.trim() || nameEl !== saved.nameEl.trim()) input.name = { en: nameEn, el: nameEl };
    const sortOrder = parseSortOrder(form.sortOrder);
    if (sortOrder !== null && sortOrder !== parseSortOrder(saved.sortOrder)) input.sortOrder = sortOrder;
    if (form.isVisible !== saved.isVisible) input.isVisible = form.isVisible;
    return input;
}

// Every value, flag and action of the category drawer, including which Shopify collections are
// checked. A create that succeeds before its PUT collections fails is remembered (saved), so a
// retry doesn't create a second category.
export function useShopCategoryForm(category: AdminShopCategoryDto | null, defaultSortOrder: number, onDoneAction: () => void) {
    const create = useCreateShopCategory();
    const patch = usePatchShopCategory();
    const setCollections = useSetShopCategoryCollections();
    const remove = useDeleteShopCategory();

    const [form, setForm] = useState<ShopCategoryForm>(() =>
        category
            ? formOf(category)
            : { nameEn: '', nameEl: '', slug: '', sortOrder: String(Math.min(defaultSortOrder, SHOP_SORT_ORDER_MAX)), isVisible: false },
    );
    const [collections, setSelected] = useState<AdminShopCategoryMappingDto[]>(() => category?.collections ?? []);
    const [saved, setSaved] = useState<Saved | null>(() =>
        category ? { id: category.id, form: formOf(category), collections: category.collections } : null,
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isNew = category === null;
    const selectedKeys = keysOf(collections);
    const selectionDirty = !sameSelection(collections, saved?.collections ?? []);
    const atCollectionLimit = collections.length >= SHOP_CATEGORY_COLLECTIONS_MAX;
    const slugInvalid = isNew && form.slug !== '' && !isShopSlugValid(form.slug);
    const sortOrderInvalid = parseSortOrder(form.sortOrder) === null;
    const busy = saving || remove.isPending;
    const canSave = form.nameEn.trim() !== '' && form.nameEl.trim() !== '' && (!isNew || isShopSlugValid(form.slug)) && !sortOrderInvalid && !busy;

    function setField(field: ShopCategoryField, value: string) {
        setForm((current) => ({ ...current, [field]: field === 'slug' ? normalizeShopSlug(value) : value }));
    }

    function handleFieldChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.currentTarget;
        if (FIELDS.has(name)) setField(name as ShopCategoryField, value);
    }

    function setVisible(next: boolean) {
        setForm((current) => ({ ...current, isVisible: next }));
    }

    function isSelected(storeId: string, collectionGid: string): boolean {
        return selectedKeys.has(shopCollectionKey(storeId, collectionGid));
    }

    function selectedCountFor(storeId: string): number {
        return collections.filter((item) => item.storeId === storeId).length;
    }

    function selectedFor(storeId: string): AdminShopCategoryMappingDto[] {
        return collections.filter((item) => item.storeId === storeId);
    }

    function toggleCollection(storeId: string, collection: { gid: string; title: string }) {
        setSelected((current) => {
            const key = shopCollectionKey(storeId, collection.gid);
            if (current.some((item) => shopCollectionKey(item.storeId, item.collectionGid) === key)) {
                return current.filter((item) => shopCollectionKey(item.storeId, item.collectionGid) !== key);
            }
            if (current.length >= SHOP_CATEGORY_COLLECTIONS_MAX) return current;
            return [...current, { storeId, collectionGid: collection.gid, collectionTitle: collection.title }];
        });
    }

    async function submit() {
        if (!canSave) return;
        setError(null);
        setSaving(true);
        let current = saved;
        try {
            if (!current) {
                const created = await create.mutateAsync({
                    name: { en: form.nameEn.trim(), el: form.nameEl.trim() },
                    slug: form.slug,
                    sortOrder: parseSortOrder(form.sortOrder) ?? 0,
                    isVisible: form.isVisible,
                });
                current = { id: created.id, form, collections: [] };
                setSaved(current);
            } else {
                const input = patchOf(form, current.form);
                if (Object.keys(input).length > 0) {
                    await patch.mutateAsync({ id: current.id, input });
                    current = { ...current, form };
                    setSaved(current);
                }
            }
            if (!sameSelection(collections, current.collections)) {
                await setCollections.mutateAsync({ id: current.id, input: { collections } });
                setSaved({ ...current, collections });
            }
            onDoneAction();
        } catch (caught) {
            setError(caught);
        } finally {
            setSaving(false);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        void submit();
    }

    function openDelete() {
        setConfirmDelete(true);
    }

    function closeDelete() {
        setConfirmDelete(false);
    }

    async function confirmDeletion() {
        if (!category) return;
        setError(null);
        try {
            await remove.mutateAsync(category.id);
            setConfirmDelete(false);
            onDoneAction();
        } catch (caught) {
            setConfirmDelete(false);
            setError(caught);
        }
    }

    return {
        form,
        isNew,
        slugInvalid,
        sortOrderInvalid,
        canSave,
        busy,
        saving,
        error,
        setField,
        handleFieldChange,
        setVisible,
        isSelected,
        selectedCountFor,
        selectedFor,
        toggleCollection,
        selectionDirty,
        atCollectionLimit,
        submit,
        handleSubmit,
        confirmDelete,
        openDelete,
        closeDelete,
        confirmDeletion,
        deleting: remove.isPending,
    };
}
