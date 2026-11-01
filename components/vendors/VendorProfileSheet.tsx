'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VendorContactField } from '@/components/vendors/profile/VendorContactField';
import { VendorProfileInput } from '@/components/vendors/profile/VendorProfileInput';
import { VendorServiceTagsField } from '@/components/vendors/profile/VendorServiceTagsField';
import { VendorBannerField } from '@/components/vendors/VendorBannerField';
import { VendorLogoField } from '@/components/vendors/VendorLogoField';
import { useMe } from '@/hooks/useMe';
import { useVendorProfileForm } from '@/hooks/useVendorProfileForm';
import type { PartnerRole, VendorProfileDto } from '@/lib/api/types';
import { VENDOR_BUSINESS_NAME_MAX, VENDOR_DESCRIPTION_MAX, VENDOR_EMAIL_MAX, VENDOR_PHONE_MAX, VENDOR_WEBSITE_MAX } from '@/lib/vendors';

// Mounted only while open, so useVendorProfileForm always starts from the latest profile.
// No type field: a vendor's type comes from the event link they joined with.
// The contact fields are for approved partners only; guests never see them otherwise.
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
    const { data: me } = useMe();
    const form = useVendorProfileForm({ profile, defaultType, onSaved: onCloseAction });
    const { setField, toggleServiceTag, setShowPhone, setShowEmail, setLogo, setRemoveLogo, setBanner, setRemoveBanner } = form;

    const setBusinessName = useCallback((value: string) => setField('businessName', value), [setField]);
    const setDescription = useCallback((value: string) => setField('description', value), [setField]);
    const setInstagram = useCallback((value: string) => setField('instagram', value), [setField]);
    const setWebsite = useCallback((value: string) => setField('website', value), [setField]);
    const setPhone = useCallback((value: string) => setField('contactPhone', value), [setField]);
    const setEmail = useCallback((value: string) => setField('contactEmail', value), [setField]);

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
                    <VendorProfileInput
                        label={t('businessName')}
                        value={form.values.businessName}
                        error={form.fieldErrors.businessName}
                        maxLength={VENDOR_BUSINESS_NAME_MAX}
                        autoComplete="organization"
                        required
                        onChangeAction={setBusinessName}
                    />

                    {/* Description */}
                    <VendorProfileInput
                        label={t('description')}
                        value={form.values.description}
                        maxLength={VENDOR_DESCRIPTION_MAX}
                        placeholder={t('descriptionHint')}
                        multiline
                        onChangeAction={setDescription}
                    />

                    {/* Services */}
                    <VendorServiceTagsField
                        vendorType={form.values.vendorType}
                        selected={form.values.serviceTags}
                        disabled={form.isSaving}
                        onToggleAction={toggleServiceTag}
                    />

                    {/* Links */}
                    <VendorProfileInput
                        label={t('instagram')}
                        value={form.values.instagram}
                        error={form.fieldErrors.instagram}
                        maxLength={VENDOR_WEBSITE_MAX}
                        placeholder={t('instagramHint')}
                        autoComplete="off"
                        onChangeAction={setInstagram}
                    />
                    <VendorProfileInput
                        label={t('website')}
                        value={form.values.website}
                        error={form.fieldErrors.website}
                        maxLength={VENDOR_WEBSITE_MAX}
                        placeholder={t('websiteHint')}
                        inputMode="url"
                        autoComplete="url"
                        onChangeAction={setWebsite}
                    />

                    {/* Contact */}
                    {me?.partner && (
                        <section aria-labelledby="vendor-contact-title" className="flex flex-col gap-3 rounded-2xl bg-surface-muted/60 p-4">
                            <h3 id="vendor-contact-title" className="text-sm font-semibold text-ink">
                                {t('contactTitle')}
                            </h3>
                            <VendorContactField
                                label={t('phone')}
                                value={form.values.contactPhone}
                                error={form.fieldErrors.contactPhone}
                                maxLength={VENDOR_PHONE_MAX}
                                type="tel"
                                autoComplete="tel"
                                shown={form.values.showPhone}
                                disabled={form.isSaving}
                                onChangeAction={setPhone}
                                onShownChangeAction={setShowPhone}
                            />
                            <VendorContactField
                                label={t('email')}
                                value={form.values.contactEmail}
                                error={form.fieldErrors.contactEmail}
                                maxLength={VENDOR_EMAIL_MAX}
                                type="email"
                                autoComplete="email"
                                shown={form.values.showEmail}
                                disabled={form.isSaving}
                                onChangeAction={setEmail}
                                onShownChangeAction={setShowEmail}
                            />
                        </section>
                    )}

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

                    {/* Banner */}
                    <VendorBannerField
                        file={form.banner}
                        currentBannerUrl={profile?.bannerUrl ?? null}
                        removeBanner={form.removeBanner}
                        name={form.values.businessName}
                        disabled={form.isSaving}
                        setBanner={setBanner}
                        setRemoveBanner={setRemoveBanner}
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
