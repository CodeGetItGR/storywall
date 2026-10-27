'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { ShopCollectionGroup } from '@/components/admin/shop/ShopCollectionGroup';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useShopCategoryForm } from '@/hooks/useShopCategoryForm';
import type { AdminShopCategoryDto, AdminShopStoreDto } from '@/lib/api/types';
import { SHOP_CATEGORY_COLLECTIONS_MAX, SHOP_CATEGORY_NAME_MAX, SHOP_SLUG_MAX, SHOP_SORT_ORDER_MAX } from '@/lib/shopAdmin';

const FORM_ID = 'shop-category-form';
const COLLECTIONS_LABEL_ID = 'shop-category-collections';

// Create or edit one shop category and the Shopify collections it shows. The panel mounts it per
// opening, so the form starts from the category's saved values.
export function ShopCategoryDrawer({
    category,
    stores,
    defaultSortOrder,
    onCloseAction,
}: {
    category: AdminShopCategoryDto | null;
    stores: AdminShopStoreDto[];
    defaultSortOrder: number;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.shop');
    const tAdmin = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const toErrorMessage = useApiErrorMessage();
    const form = useShopCategoryForm(category, defaultSortOrder, onCloseAction);
    const categoryName = category ? localizedText(category.name) : '';

    return (
        <>
            <AdminDrawer
                open
                onClose={onCloseAction}
                closeLabel={tAdmin('cancel')}
                closeDisabled={form.busy}
                title={category ? t('categories.editTitle') : t('categories.createTitle')}
                subtitle={category ? categoryName : undefined}
                footer={
                    <>
                        {/* Danger */}
                        <div>
                            {category && (
                                <button
                                    type="button"
                                    onClick={form.openDelete}
                                    disabled={form.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('categories.delete')}
                                </button>
                            )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={form.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {tAdmin('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={!form.canSave}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {form.saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {tAdmin('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-5">
                    {/* Names */}
                    <AdminField label={t('categories.nameEn')} required>
                        <input
                            name="nameEn"
                            aria-label={t('categories.nameEn')}
                            className={adminInputClass()}
                            maxLength={SHOP_CATEGORY_NAME_MAX}
                            required
                            value={form.form.nameEn}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>
                    <AdminField label={t('categories.nameEl')} required>
                        <input
                            name="nameEl"
                            aria-label={t('categories.nameEl')}
                            className={adminInputClass()}
                            maxLength={SHOP_CATEGORY_NAME_MAX}
                            required
                            value={form.form.nameEl}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>

                    {/* Link and order */}
                    <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
                        <AdminField label={t('categories.slug')} required={form.isNew} hint={form.isNew ? t('categories.slugHint') : undefined}>
                            <input
                                name="slug"
                                aria-label={t('categories.slug')}
                                aria-invalid={form.slugInvalid || undefined}
                                className={adminInputClass(form.isNew ? 'font-mono' : 'cursor-not-allowed bg-canvas font-mono text-ink-muted')}
                                maxLength={SHOP_SLUG_MAX}
                                readOnly={!form.isNew}
                                required={form.isNew}
                                autoComplete="off"
                                spellCheck={false}
                                value={form.form.slug}
                                onChange={form.handleFieldChange}
                            />
                        </AdminField>
                        <AdminField label={t('categories.order')} required>
                            <input
                                name="sortOrder"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={SHOP_SORT_ORDER_MAX}
                                step={1}
                                aria-label={t('categories.order')}
                                aria-invalid={form.sortOrderInvalid || undefined}
                                className={adminInputClass('font-mono')}
                                required
                                value={form.form.sortOrder}
                                onChange={form.handleFieldChange}
                            />
                        </AdminField>
                    </div>
                    {form.slugInvalid && <p className="-mt-3 text-xs text-status-danger">{t('slugInvalid')}</p>}
                    {form.sortOrderInvalid && (
                        <p className="-mt-3 text-xs text-status-danger">{t('categories.orderInvalid', { max: SHOP_SORT_ORDER_MAX })}</p>
                    )}

                    {/* Visibility */}
                    <div className="rounded-lg border border-border">
                        <AdminSwitch label={t('visible')} checked={form.form.isVisible} onCheckedChangeAction={form.setVisible} />
                    </div>

                    {/* Collections */}
                    <div role="group" aria-labelledby={COLLECTIONS_LABEL_ID} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                            <p id={COLLECTIONS_LABEL_ID} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                                {t('categories.collections')}
                            </p>
                            {form.atCollectionLimit && (
                                <p className="text-xs text-status-warn">{t('categories.collectionsLimit', { max: SHOP_CATEGORY_COLLECTIONS_MAX })}</p>
                            )}
                        </div>
                        {stores.length === 0 ? (
                            <p className="text-sm text-ink-muted">{t('categories.noStores')}</p>
                        ) : (
                            <div className="rounded-lg border border-border">
                                {stores.map((store) => (
                                    <ShopCollectionGroup
                                        key={store.id}
                                        store={store}
                                        selected={form.selectedFor(store.id)}
                                        atLimit={form.atCollectionLimit}
                                        isSelected={form.isSelected}
                                        onToggleAction={form.toggleCollection}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {form.error !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {toErrorMessage(form.error)}
                        </p>
                    )}
                </form>
            </AdminDrawer>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={form.confirmDelete}
                onCloseAction={form.closeDelete}
                title={t('categories.deleteTitle', { name: categoryName })}
                body={t('categories.deleteBody')}
                cancelLabel={t('categories.keep')}
                confirmLabel={t('categories.delete')}
                isConfirming={form.deleting}
                onConfirmAction={form.confirmDeletion}
                icon={form.deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
