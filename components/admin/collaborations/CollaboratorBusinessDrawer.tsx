'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useCollaboratorBusinessDrawer } from '@/hooks/useCollaboratorBusinessDrawer';
import { type BusinessDetailField, formatIban } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { VIES_COUNTRY_CODES, viesCountryName } from '@/lib/businessProfile';

export function CollaboratorBusinessDrawer({
    open,
    collaborator,
    onCloseAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.business');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const drawer = useCollaboratorBusinessDrawer(collaborator, onCloseAction);

    // The field's own rule message, else its hint.
    const hintFor = (field: BusinessDetailField, hint?: string) => {
        const error = drawer.fieldErrors[field];
        return error ? t(`errors.${error}`) : hint;
    };
    const inputClass = (field: BusinessDetailField, className?: string) =>
        adminInputClass(drawer.fieldErrors[field] ? `border-status-danger ${className ?? ''}` : className);

    return (
        <AdminDrawer
            open={open}
            onClose={drawer.handleClose}
            closeDisabled={drawer.isSaving}
            closeLabel={tAdmin('cancel')}
            title={t('drawerTitle', { name: collaborator.name })}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={drawer.handleClose}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="collaborator-business-form"
                        disabled={drawer.isSaving}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {drawer.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="collaborator-business-form" onSubmit={drawer.handleSubmit} noValidate className="space-y-7">
                {/* Invoicing */}
                <fieldset className="space-y-4">
                    <legend className="mb-3 text-sm font-semibold text-ink">{t('groups.invoicing')}</legend>
                    <AdminField label={t('fields.legalName')} hint={hintFor('legalName')}>
                        <input name="legalName" maxLength={200} defaultValue={collaborator.legalName ?? ''} className={inputClass('legalName')} />
                    </AdminField>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label={t('fields.countryCode')} hint={hintFor('countryCode')}>
                            <select
                                name="countryCode"
                                value={drawer.countryCode}
                                onChange={drawer.handleCountryChange}
                                className={inputClass('countryCode')}
                            >
                                <option value="">{t('noCountry')}</option>
                                {VIES_COUNTRY_CODES.map((code) => (
                                    <option key={code} value={code}>
                                        {viesCountryName(locale, code, t('northernIreland'))}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <AdminField label={t('fields.vatNumber')} hint={hintFor('vatNumber')}>
                            <input
                                name="vatNumber"
                                maxLength={30}
                                defaultValue={collaborator.vatNumber ?? ''}
                                className={inputClass('vatNumber', 'font-mono')}
                            />
                        </AdminField>
                    </div>
                    <AdminField
                        label={t('fields.taxOffice')}
                        required={drawer.taxOfficeRequired}
                        hint={hintFor('taxOffice', drawer.taxOfficeRequired ? undefined : t('hints.taxOffice'))}
                    >
                        <input name="taxOffice" maxLength={100} defaultValue={collaborator.taxOffice ?? ''} className={inputClass('taxOffice')} />
                    </AdminField>
                    <AdminField label={t('fields.addressLine1')}>
                        <input
                            name="addressLine1"
                            maxLength={200}
                            defaultValue={collaborator.addressLine1 ?? ''}
                            className={inputClass('addressLine1')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.addressLine2')}>
                        <input
                            name="addressLine2"
                            maxLength={200}
                            defaultValue={collaborator.addressLine2 ?? ''}
                            className={inputClass('addressLine2')}
                        />
                    </AdminField>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label={t('fields.city')}>
                            <input name="city" maxLength={100} defaultValue={collaborator.city ?? ''} className={inputClass('city')} />
                        </AdminField>
                        <AdminField label={t('fields.postalCode')}>
                            <input
                                name="postalCode"
                                maxLength={20}
                                defaultValue={collaborator.postalCode ?? ''}
                                className={inputClass('postalCode')}
                            />
                        </AdminField>
                    </div>
                </fieldset>

                {/* Payout */}
                <fieldset className="space-y-4">
                    <legend className="mb-3 text-sm font-semibold text-ink">{t('groups.payout')}</legend>
                    <AdminField label={t('fields.payoutIban')} hint={hintFor('payoutIban')}>
                        <input
                            name="payoutIban"
                            maxLength={42}
                            autoComplete="off"
                            spellCheck={false}
                            defaultValue={collaborator.payoutIban ? formatIban(collaborator.payoutIban) : ''}
                            className={inputClass('payoutIban', 'font-mono')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.payoutAccountHolder')}>
                        <input
                            name="payoutAccountHolder"
                            maxLength={140}
                            defaultValue={collaborator.payoutAccountHolder ?? ''}
                            className={inputClass('payoutAccountHolder')}
                        />
                    </AdminField>
                </fieldset>

                {/* Contact */}
                <fieldset className="space-y-4">
                    <legend className="mb-3 text-sm font-semibold text-ink">{t('groups.contact')}</legend>
                    <AdminField label={t('fields.contactPersonName')}>
                        <input
                            name="contactPersonName"
                            maxLength={200}
                            defaultValue={collaborator.contactPersonName ?? ''}
                            className={inputClass('contactPersonName')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.contactPhone')} hint={hintFor('contactPhone', t('hints.contactPhone'))}>
                        <input
                            name="contactPhone"
                            type="tel"
                            maxLength={30}
                            defaultValue={collaborator.contactPhone ?? ''}
                            className={inputClass('contactPhone', 'font-mono')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.billingEmail')} hint={hintFor('billingEmail', t('hints.billingEmail'))}>
                        <input
                            name="billingEmail"
                            type="email"
                            maxLength={320}
                            defaultValue={collaborator.billingEmail ?? ''}
                            className={inputClass('billingEmail')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.websiteUrl')} hint={hintFor('websiteUrl', t('hints.websiteUrl'))}>
                        <input
                            name="websiteUrl"
                            type="url"
                            maxLength={500}
                            defaultValue={collaborator.websiteUrl ?? ''}
                            className={inputClass('websiteUrl')}
                        />
                    </AdminField>
                </fieldset>

                {/* Save error */}
                {drawer.saveError && (
                    <p className="text-sm text-status-danger">
                        {drawer.saveRejected ? t('errors.rejected') : tAdmin(`errors.${adminErrorMessageKey(drawer.saveError)}`)}
                    </p>
                )}
            </form>
        </AdminDrawer>
    );
}
