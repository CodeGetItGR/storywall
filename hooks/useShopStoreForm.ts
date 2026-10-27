'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateShopStore, useDeleteShopStore, usePatchShopStore, useSyncShopStore } from '@/hooks/useAdminShopStores';
import type { AdminShopStoreDto, AdminShopStorePatchDto } from '@/lib/api/types';
import { isShopDomainValid, isShopSlugValid, normalizeShopDomain, normalizeShopSlug } from '@/lib/shopAdmin';

export type ShopStoreField = 'name' | 'slug' | 'shopDomain' | 'clientId' | 'clientSecret';
export type ShopStoreForm = Record<ShopStoreField, string> & { isVisible: boolean };

const EMPTY_FORM: ShopStoreForm = { name: '', slug: '', shopDomain: '', clientId: '', clientSecret: '', isVisible: false };
const FIELDS: ReadonlySet<string> = new Set<ShopStoreField>(['name', 'slug', 'shopDomain', 'clientId', 'clientSecret']);

function formOf(store: AdminShopStoreDto): ShopStoreForm {
    // The secret is never sent back; an empty field means "keep the saved one".
    return {
        name: store.name,
        slug: store.slug,
        shopDomain: store.shopDomain,
        clientId: store.clientId,
        clientSecret: '',
        isVisible: store.isVisible,
    };
}

function normalize(field: ShopStoreField, value: string): string {
    if (field === 'slug') return normalizeShopSlug(value);
    if (field === 'shopDomain') return normalizeShopDomain(value);
    return value;
}

// Only what changed; slug and domain can't change after create.
function patchOf(form: ShopStoreForm, store: AdminShopStoreDto): AdminShopStorePatchDto {
    const input: AdminShopStorePatchDto = {};
    const name = form.name.trim();
    const clientId = form.clientId.trim();
    const clientSecret = form.clientSecret.trim();
    if (name !== store.name) input.name = name;
    if (clientId !== store.clientId) input.clientId = clientId;
    if (clientSecret) input.clientSecret = clientSecret;
    if (form.isVisible !== store.isVisible) input.isVisible = form.isVisible;
    return input;
}

// Every value, flag and action of the store drawer. The drawer remounts per opening, so the
// form starts from the store's saved values.
export function useShopStoreForm(store: AdminShopStoreDto | null, onDoneAction: () => void) {
    const create = useCreateShopStore();
    const patch = usePatchShopStore();
    const remove = useDeleteShopStore();
    const sync = useSyncShopStore();

    const [form, setForm] = useState<ShopStoreForm>(() => (store ? formOf(store) : EMPTY_FORM));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [syncStarted, setSyncStarted] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isNew = store === null;
    const slugInvalid = isNew && form.slug !== '' && !isShopSlugValid(form.slug);
    const domainInvalid = isNew && form.shopDomain.trim() !== '' && !isShopDomainValid(form.shopDomain);
    const busy = saving || remove.isPending;
    const filled =
        form.name.trim() !== '' &&
        form.clientId.trim() !== '' &&
        (!isNew || (isShopSlugValid(form.slug) && isShopDomainValid(form.shopDomain) && form.clientSecret.trim() !== ''));
    const canSave = filled && !busy;

    function setField(field: ShopStoreField, value: string) {
        setForm((current) => ({ ...current, [field]: normalize(field, value) }));
    }

    function handleFieldChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.currentTarget;
        if (FIELDS.has(name)) setField(name as ShopStoreField, value);
    }

    function setVisible(next: boolean) {
        setForm((current) => ({ ...current, isVisible: next }));
    }

    async function submit() {
        if (!canSave) return;
        setError(null);
        setSaving(true);
        try {
            if (!store) {
                await create.mutateAsync({
                    name: form.name.trim(),
                    slug: form.slug,
                    shopDomain: form.shopDomain.trim(),
                    clientId: form.clientId.trim(),
                    clientSecret: form.clientSecret.trim(),
                    isVisible: form.isVisible,
                });
            } else {
                const input = patchOf(form, store);
                if (Object.keys(input).length > 0) await patch.mutateAsync({ id: store.id, input });
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

    async function syncNow() {
        if (!store) return;
        setError(null);
        setSyncStarted(false);
        try {
            await sync.mutateAsync(store.id);
            setSyncStarted(true);
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSyncClick() {
        void syncNow();
    }

    function openDelete() {
        setConfirmDelete(true);
    }

    function closeDelete() {
        setConfirmDelete(false);
    }

    async function confirmDeletion() {
        if (!store) return;
        setError(null);
        try {
            await remove.mutateAsync(store.id);
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
        domainInvalid,
        canSave,
        busy,
        saving,
        error,
        setField,
        handleFieldChange,
        setVisible,
        submit,
        handleSubmit,
        syncNow,
        handleSyncClick,
        syncing: sync.isPending,
        syncStarted,
        confirmDelete,
        openDelete,
        closeDelete,
        confirmDeletion,
        deleting: remove.isPending,
    };
}
