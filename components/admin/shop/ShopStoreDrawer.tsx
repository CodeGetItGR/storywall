'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useShopStoreForm } from '@/hooks/useShopStoreForm';
import type { AdminShopStoreDto } from '@/lib/api/types';
import { SHOP_CLIENT_ID_MAX, SHOP_CLIENT_SECRET_MAX, SHOP_DOMAIN_MAX, SHOP_SLUG_MAX, SHOP_STORE_NAME_MAX } from '@/lib/shopAdmin';

const FORM_ID = 'shop-store-form';
const MONO = 'font-mono';
const LOCKED = 'cursor-not-allowed bg-canvas text-ink-muted';

// Connect or edit one Shopify store. The panel mounts it per opening, so the form starts from the
// store's saved values.
export function ShopStoreDrawer({ store, onCloseAction }: { store: AdminShopStoreDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.shop');
    const tAdmin = useTranslations('AdminPage');
    const toErrorMessage = useApiErrorMessage();
    const form = useShopStoreForm(store, onCloseAction);

    return (
        <>
            <AdminDrawer
                open
                onClose={onCloseAction}
                closeLabel={tAdmin('cancel')}
                closeDisabled={form.busy}
                title={store ? t('stores.editTitle') : t('stores.createTitle')}
                subtitle={store?.name}
                footer={
                    <>
                        {/* Danger */}
                        <div>
                            {store && (
                                <button
                                    type="button"
                                    onClick={form.openDelete}
                                    disabled={form.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('stores.remove')}
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
                    {/* Store */}
                    <AdminField label={t('stores.name')} required>
                        <input
                            name="name"
                            aria-label={t('stores.name')}
                            className={adminInputClass()}
                            maxLength={SHOP_STORE_NAME_MAX}
                            required
                            value={form.form.name}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>
                    <AdminField label={t('stores.slug')} required={form.isNew} hint={form.isNew ? t('stores.slugHint') : undefined}>
                        <input
                            name="slug"
                            aria-label={t('stores.slug')}
                            aria-invalid={form.slugInvalid || undefined}
                            className={adminInputClass(form.isNew ? MONO : `${MONO} ${LOCKED}`)}
                            maxLength={SHOP_SLUG_MAX}
                            readOnly={!form.isNew}
                            required={form.isNew}
                            autoComplete="off"
                            spellCheck={false}
                            value={form.form.slug}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>
                    {form.slugInvalid && <p className="-mt-3 text-xs text-status-danger">{t('slugInvalid')}</p>}

                    {/* Shopify */}
                    <AdminField label={t('stores.domain')} required={form.isNew}>
                        <input
                            name="shopDomain"
                            aria-label={t('stores.domain')}
                            aria-invalid={form.domainInvalid || undefined}
                            className={adminInputClass(form.isNew ? MONO : `${MONO} ${LOCKED}`)}
                            maxLength={SHOP_DOMAIN_MAX}
                            readOnly={!form.isNew}
                            required={form.isNew}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="yourstore.myshopify.com"
                            value={form.form.shopDomain}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>
                    {form.domainInvalid && <p className="-mt-3 text-xs text-status-danger">{t('stores.domainInvalid')}</p>}
                    <AdminField label={t('stores.clientId')} required>
                        <input
                            name="clientId"
                            aria-label={t('stores.clientId')}
                            className={adminInputClass(MONO)}
                            maxLength={SHOP_CLIENT_ID_MAX}
                            required
                            autoComplete="off"
                            spellCheck={false}
                            value={form.form.clientId}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>
                    <AdminField label={t('stores.clientSecret')} required={form.isNew}>
                        <input
                            name="clientSecret"
                            type="password"
                            aria-label={t('stores.clientSecret')}
                            className={adminInputClass(MONO)}
                            maxLength={SHOP_CLIENT_SECRET_MAX}
                            required={form.isNew}
                            autoComplete="new-password"
                            placeholder={form.isNew ? undefined : t('stores.secretUnchanged')}
                            value={form.form.clientSecret}
                            onChange={form.handleFieldChange}
                        />
                    </AdminField>

                    {/* Visibility */}
                    <div className="rounded-lg border border-border">
                        <AdminSwitch label={t('visible')} checked={form.form.isVisible} onCheckedChangeAction={form.setVisible} />
                    </div>

                    {/* Sync */}
                    {store && (
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={form.handleSyncClick}
                                disabled={form.syncing || form.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink disabled:opacity-50"
                            >
                                {form.syncing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                )}
                                {t('stores.syncNow')}
                            </button>
                            {form.syncStarted && (
                                <p role="status" className="text-sm text-status-good">
                                    {t('stores.syncStarted')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {form.error !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {toErrorMessage(form.error)}
                        </p>
                    )}
                </form>
            </AdminDrawer>

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={form.confirmDelete}
                onCloseAction={form.closeDelete}
                title={t('stores.removeTitle', { name: store?.name ?? '' })}
                body={t('stores.removeBody')}
                cancelLabel={t('stores.keep')}
                confirmLabel={t('stores.remove')}
                isConfirming={form.deleting}
                onConfirmAction={form.confirmDeletion}
                icon={form.deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
