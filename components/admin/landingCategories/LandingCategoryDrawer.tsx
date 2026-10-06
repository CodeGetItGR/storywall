'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import {
    useCreateLandingCategory,
    useDeleteLandingCategory,
    usePatchLandingCategory,
    useSetLandingCategoryEventTypes,
} from '@/hooks/useAdminLandingCategories';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { getLandingCategoryConflict, type LandingCategoryConflict } from '@/lib/api/errors';
import type {
    AdminLandingCategoryDto,
    AdminLandingCategoryPatchDto,
    EventTypeConvention,
    LocalizedText,
    PlatformEventTypeResponseDto,
} from '@/lib/api/types';
import { nextSortOrder } from '@/lib/sortOrder';
import { cn } from '@/lib/utils';

const FORM_ID = 'landing-category-form';
const TYPES_LABEL_ID = 'landing-category-event-types';
const NAME_MAX = 60;
const DESCRIPTION_MAX = 160;
// The server's cap on sortOrder (LandingCategoryCreateDto @Max).
const SORT_ORDER_MAX = 1000;

type TextField = 'nameEn' | 'nameEl' | 'descriptionEn' | 'descriptionEl';
type Form = Record<TextField, string> & { isVisible: boolean; isDefault: boolean; eventTypeKeys: EventTypeConvention[] };
// retry: the server reported the conflict (the list was stale), so confirming re-sends the save.
type PendingMove = { key: EventTypeConvention; from: string; retry: boolean };
// Types the server said (5150) sit in another category, which the list didn't show.
type LearnedHolders = ReadonlyMap<EventTypeConvention, LandingCategoryConflict>;
type ConfirmedKeys = ReadonlySet<EventTypeConvention>;

function formOf(category: AdminLandingCategoryDto): Form {
    return {
        nameEn: category.name.en ?? '',
        nameEl: category.name.el ?? '',
        descriptionEn: category.description.en ?? '',
        descriptionEl: category.description.el ?? '',
        isVisible: category.isVisible,
        isDefault: category.isDefault,
        eventTypeKeys: category.eventTypeKeys,
    };
}

const EMPTY_FORM: Form = { nameEn: '', nameEl: '', descriptionEn: '', descriptionEl: '', isVisible: true, isDefault: false, eventTypeKeys: [] };

function trimmed(form: Form): Form {
    return {
        ...form,
        nameEn: form.nameEn.trim(),
        nameEl: form.nameEl.trim(),
        descriptionEn: form.descriptionEn.trim(),
        descriptionEl: form.descriptionEl.trim(),
        isDefault: form.isVisible && form.isDefault,
    };
}

// Blank entries are left out: the server keeps only what is sent.
function descriptionOf(form: Form): LocalizedText {
    return { ...(form.descriptionEn && { en: form.descriptionEn }), ...(form.descriptionEl && { el: form.descriptionEl }) };
}

// Only what changed since the last save, so an unchanged field isn't re-sent (or audited).
function patchOf(form: Form, saved: Form): AdminLandingCategoryPatchDto {
    const input: AdminLandingCategoryPatchDto = {};
    if (form.nameEn !== saved.nameEn || form.nameEl !== saved.nameEl) input.name = { en: form.nameEn, el: form.nameEl };
    if (form.descriptionEn !== saved.descriptionEn || form.descriptionEl !== saved.descriptionEl) input.description = descriptionOf(form);
    if (form.isVisible !== saved.isVisible) input.isVisible = form.isVisible;
    if (form.isDefault !== saved.isDefault) input.isDefault = form.isDefault;
    return input;
}

function sameTypes(left: EventTypeConvention[], right: EventTypeConvention[]): boolean {
    return left.length === right.length && left.every((key) => right.includes(key));
}

// Create or edit one landing category. The panel remounts it (key) on every opening, so the form
// starts from the category's saved values. A create that succeeds before its PUT event-types fails
// is remembered (savedId), so the retry doesn't create a second category.
export function LandingCategoryDrawer({
    open,
    category,
    categories,
    eventTypes,
    onCloseAction,
}: {
    open: boolean;
    category: AdminLandingCategoryDto | null;
    categories: AdminLandingCategoryDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const create = useCreateLandingCategory();
    const patch = usePatchLandingCategory();
    const setTypes = useSetLandingCategoryEventTypes();
    const remove = useDeleteLandingCategory();

    const [form, setForm] = useState<Form>(() => (category ? formOf(category) : EMPTY_FORM));
    const [saved, setSaved] = useState<{ id: string; form: Form } | null>(() => (category ? { id: category.id, form: formOf(category) } : null));
    // The moves the admin agreed to. A key leaves the set when it's taken out of the form, so
    // adding it again asks again.
    const [confirmed, setConfirmed] = useState<ConfirmedKeys>(() => new Set());
    const [learned, setLearned] = useState<LearnedHolders>(() => new Map());
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const busy = saving || remove.isPending;
    const canSave = form.nameEn.trim() !== '' && form.nameEl.trim() !== '' && !busy;

    function eventTypeName(key: EventTypeConvention) {
        return localizedText(eventTypes.find((type) => type.eventTypeKey === key)?.name, key);
    }

    function holderOf(key: EventTypeConvention) {
        const ownId = saved?.id ?? category?.id;
        return categories.find((item) => item.id !== ownId && item.eventTypeKeys.includes(key));
    }

    // The name of the category holding a key, from the list, else from a 5150 (by its id in the
    // list, so it's in the admin's locale; the server's own name if the list doesn't have it).
    function holderNameOf(key: EventTypeConvention, holders: LearnedHolders): string | null {
        const listed = holderOf(key);
        if (listed) return localizedText(listed.name);
        const conflict = holders.get(key);
        if (!conflict) return null;
        const known = categories.find((item) => item.id === conflict.categoryId);
        return known ? localizedText(known.name) : conflict.categoryName;
    }

    // moveFromOtherCategory goes out only when every key known to sit elsewhere was confirmed;
    // otherwise the server answers 5150 and the admin is asked about that key.
    function canMove(keys: EventTypeConvention[], confirmedKeys: ConfirmedKeys, holders: LearnedHolders): boolean {
        const held = keys.filter((key) => holderNameOf(key, holders) !== null);
        return held.length > 0 && held.every((key) => confirmedKeys.has(key));
    }

    async function save(confirmedKeys: ConfirmedKeys, holders: LearnedHolders) {
        const values = trimmed(form);
        setError(null);
        setSaving(true);
        let current = saved;
        try {
            if (!current) {
                const created = await create.mutateAsync({
                    name: { en: values.nameEn, el: values.nameEl },
                    description: descriptionOf(values),
                    sortOrder: Math.min(nextSortOrder(categories), SORT_ORDER_MAX),
                    isVisible: values.isVisible,
                    isDefault: values.isDefault,
                });
                current = { id: created.id, form: { ...values, eventTypeKeys: [] } };
                setSaved(current);
            } else {
                const input = patchOf(values, current.form);
                if (Object.keys(input).length > 0) {
                    await patch.mutateAsync({ id: current.id, input });
                    current = { id: current.id, form: { ...values, eventTypeKeys: current.form.eventTypeKeys } };
                    setSaved(current);
                }
            }
            if (!sameTypes(values.eventTypeKeys, current.form.eventTypeKeys)) {
                const moveFromOtherCategory = canMove(values.eventTypeKeys, confirmedKeys, holders);
                await setTypes.mutateAsync({ id: current.id, input: { eventTypeKeys: values.eventTypeKeys, moveFromOtherCategory } });
            }
            onCloseAction();
        } catch (caught) {
            const conflict = getLandingCategoryConflict(caught);
            if (!conflict) {
                setError(caught);
                return;
            }
            const conflictKey = conflict.eventTypeKey as EventTypeConvention;
            const nextHolders = new Map(holders).set(conflictKey, conflict);
            setLearned(nextHolders);
            // Ask about the key the server named or, if that one was already confirmed, the next
            // key held elsewhere that wasn't.
            const ask = [conflictKey, ...values.eventTypeKeys].find((key) => !confirmedKeys.has(key) && holderNameOf(key, nextHolders) !== null);
            if (ask) setPendingMove({ key: ask, from: holderNameOf(ask, nextHolders) ?? conflict.categoryName, retry: true });
            else setError(caught);
        } finally {
            setSaving(false);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        void save(confirmed, learned);
    }

    function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleVisibleChange(next: boolean) {
        setForm((current) => ({ ...current, isVisible: next, isDefault: next && current.isDefault }));
    }

    function handleDefaultChange(next: boolean) {
        setForm((current) => ({ ...current, isDefault: next }));
    }

    function handleTypeClick(event: MouseEvent<HTMLButtonElement>) {
        const key = eventTypes.find((type) => type.eventTypeKey === event.currentTarget.dataset.eventTypeKey)?.eventTypeKey;
        if (!key) return;
        if (form.eventTypeKeys.includes(key)) {
            setForm((current) => ({ ...current, eventTypeKeys: current.eventTypeKeys.filter((item) => item !== key) }));
            setConfirmed((current) => new Set([...current].filter((item) => item !== key)));
            return;
        }
        const holderName = holderNameOf(key, learned);
        if (holderName !== null) {
            setPendingMove({ key, from: holderName, retry: false });
            return;
        }
        setForm((current) => ({ ...current, eventTypeKeys: [...current.eventTypeKeys, key] }));
    }

    function confirmMove() {
        if (!pendingMove) return;
        const nextConfirmed = new Set(confirmed).add(pendingMove.key);
        setConfirmed(nextConfirmed);
        setPendingMove(null);
        if (pendingMove.retry) {
            void save(nextConfirmed, learned);
            return;
        }
        const { key } = pendingMove;
        setForm((current) => ({
            ...current,
            eventTypeKeys: current.eventTypeKeys.includes(key) ? current.eventTypeKeys : [...current.eventTypeKeys, key],
        }));
    }

    function closeMoveConfirmation() {
        setPendingMove(null);
    }

    function openDeleteConfirmation() {
        setConfirmDelete(true);
    }

    function closeDeleteConfirmation() {
        setConfirmDelete(false);
    }

    async function confirmDeletion() {
        if (!category) return;
        setError(null);
        try {
            await remove.mutateAsync(category.id);
            setConfirmDelete(false);
            onCloseAction();
        } catch (caught) {
            setConfirmDelete(false);
            setError(caught);
        }
    }

    const categoryName = category ? localizedText(category.name) : '';

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={busy}
                title={category ? t('landingCategories.editTitle') : t('landingCategories.createTitle')}
                subtitle={category ? categoryName : undefined}
                footer={
                    <>
                        <div>
                            {category && (
                                <button
                                    type="button"
                                    onClick={openDeleteConfirmation}
                                    disabled={busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('landingCategories.delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={!canSave}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
                    <AdminField label={t('landingCategories.nameEn')} required>
                        <input
                            name="nameEn"
                            aria-label={t('landingCategories.nameEn')}
                            className={adminInputClass()}
                            maxLength={NAME_MAX}
                            required
                            value={form.nameEn}
                            onChange={handleTextChange}
                        />
                    </AdminField>
                    <AdminField label={t('landingCategories.nameEl')} required>
                        <input
                            name="nameEl"
                            aria-label={t('landingCategories.nameEl')}
                            className={adminInputClass()}
                            maxLength={NAME_MAX}
                            required
                            value={form.nameEl}
                            onChange={handleTextChange}
                        />
                    </AdminField>
                    <AdminField label={t('landingCategories.descriptionEn')} optional>
                        <input
                            name="descriptionEn"
                            aria-label={t('landingCategories.descriptionEn')}
                            className={adminInputClass()}
                            maxLength={DESCRIPTION_MAX}
                            value={form.descriptionEn}
                            onChange={handleTextChange}
                        />
                    </AdminField>
                    <AdminField label={t('landingCategories.descriptionEl')} optional>
                        <input
                            name="descriptionEl"
                            aria-label={t('landingCategories.descriptionEl')}
                            className={adminInputClass()}
                            maxLength={DESCRIPTION_MAX}
                            value={form.descriptionEl}
                            onChange={handleTextChange}
                        />
                    </AdminField>

                    <div className="rounded-lg border border-border">
                        <AdminSwitch label={t('landingCategories.visible')} checked={form.isVisible} onCheckedChangeAction={handleVisibleChange} />
                        <AdminSwitch
                            label={t('landingCategories.default')}
                            checked={form.isVisible && form.isDefault}
                            disabled={!form.isVisible}
                            onCheckedChangeAction={handleDefaultChange}
                        />
                    </div>

                    {/* A group, not an AdminField: a <label> would name only the first chip. */}
                    <div role="group" aria-labelledby={TYPES_LABEL_ID} className="flex flex-col gap-1.5">
                        <p id={TYPES_LABEL_ID} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                            {t('landingCategories.eventTypes')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {eventTypes.map((type) => {
                                const picked = form.eventTypeKeys.includes(type.eventTypeKey);
                                const holder = picked ? undefined : holderOf(type.eventTypeKey);
                                return (
                                    <button
                                        key={type.eventTypeKey}
                                        type="button"
                                        data-event-type-key={type.eventTypeKey}
                                        aria-pressed={picked}
                                        onClick={handleTypeClick}
                                        className={cn(
                                            'rounded-md border px-2.5 py-1 text-sm transition-colors',
                                            picked ? 'border-ink bg-ink text-white' : 'border-border text-ink-muted hover:border-ink-faint',
                                        )}
                                    >
                                        {localizedText(type.name, type.eventTypeKey)}
                                        {holder && (
                                            <span className="ml-1 text-xs opacity-70">
                                                {t('landingCategories.inOtherCategory', { category: localizedText(holder.name) })}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={pendingMove !== null}
                onCloseAction={closeMoveConfirmation}
                title={t('landingCategories.moveTitle', { eventType: pendingMove ? eventTypeName(pendingMove.key) : '' })}
                body={t('landingCategories.moveBody', {
                    eventType: pendingMove ? eventTypeName(pendingMove.key) : '',
                    category: pendingMove?.from ?? '',
                })}
                cancelLabel={t('cancel')}
                confirmLabel={t('landingCategories.move')}
                isConfirming={saving}
                onConfirmAction={confirmMove}
                tone="default"
            />
            <ConfirmActionModal
                open={confirmDelete}
                onCloseAction={closeDeleteConfirmation}
                title={t('landingCategories.deleteTitle', { category: categoryName })}
                body={t('landingCategories.deleteBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('landingCategories.delete')}
                isConfirming={remove.isPending}
                onConfirmAction={confirmDeletion}
                icon={remove.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
