'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import { VendorLogoField } from '@/components/vendors/VendorLogoField';
import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';
import type { PartnerRole, VendorProfileDto } from '@/lib/api/types';
import { VENDOR_BUSINESS_NAME_MAX, VENDOR_LINK_MAX } from '@/lib/vendors';

const INPUT_CLASS =
    'min-h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

// Mounted only while open, so useVendorProfileForm always starts from the latest profile.
// No type field: a vendor's type comes from the event link they joined with.
export function VendorProfileSheet({
    open,
    profile,
    defaultType,
    onCloseAction,
}: {
    open: boolean;
    profile: VendorProfileDto | null;
    defaultType: PartnerRole;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.profile');
    const form = useVendorProfileForm({ profile, defaultType, onSaved: onCloseAction });
    const { setField, setLogo, setRemoveLogo } = form;

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setField('businessName', event.target.value), [setField]);
    const handleLinkChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setField('link', event.target.value), [setField]);

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="sm" closeDisabled={form.isSaving} ariaLabel={t('title')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <div className="pr-8">
                    <h2 className="text-lg font-bold text-ink">{t('title')}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t('body')}</p>
                </div>

                <form onSubmit={form.handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
                    {/* Business name */}
                    <div>
                        <FormFieldLabel label={t('businessName')} required>
                            <input
                                className={INPUT_CLASS}
                                value={form.values.businessName}
                                maxLength={VENDOR_BUSINESS_NAME_MAX}
                                onChange={handleNameChange}
                                aria-invalid={Boolean(form.fieldErrors.businessName)}
                                autoComplete="organization"
                            />
                        </FormFieldLabel>
                        {form.fieldErrors.businessName && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {form.fieldErrors.businessName}
                            </p>
                        )}
                    </div>

                    {/* Link */}
                    <div>
                        <FormFieldLabel label={t('link')}>
                            <input
                                className={INPUT_CLASS}
                                value={form.values.link}
                                maxLength={VENDOR_LINK_MAX}
                                placeholder={t('linkHint')}
                                onChange={handleLinkChange}
                                aria-invalid={Boolean(form.fieldErrors.link)}
                                inputMode="url"
                            />
                        </FormFieldLabel>
                        {form.fieldErrors.link && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                                {form.fieldErrors.link}
                            </p>
                        )}
                    </div>

                    {/* Logo */}
                    <VendorLogoField
                        file={form.logo}
                        currentLogoUrl={profile?.logoUrl ?? null}
                        removeLogo={form.removeLogo}
                        name={form.values.businessName}
                        disabled={form.isSaving}
                        setLogo={setLogo}
                        setRemoveLogo={setRemoveLogo}
                    />

                    {/* Error */}
                    {form.error && (
                        <p role="alert" className="text-sm text-red-600">
                            {form.error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                        <Button type="submit" size="lg" disabled={form.isSaving} className="sm:flex-1">
                            {t('save')}
                        </Button>
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction} disabled={form.isSaving} className="sm:flex-1">
                            {t('later')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
