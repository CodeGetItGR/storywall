'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import type { BusinessProfileSettings } from '@/hooks/useBusinessProfile';
import { useContentLimits } from '@/hooks/useContentLimits';

const INPUT_CLASS_NAME =
    'min-h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

function FieldError({ message }: { message: string | undefined }) {
    if (!message) return null;
    return (
        <span role="alert" className="text-xs text-red-600">
            {message}
        </span>
    );
}

export function BusinessProfileDialog({ settings }: { settings: BusinessProfileSettings }) {
    const t = useTranslations('ProfilePage.business');
    const limits = useContentLimits();
    const { form, fieldErrors } = settings;

    return (
        <Modal open={settings.isEditing} onClose={settings.closeEditor} size="md" closeLabel={t('cancel')} showCloseButton={!settings.isSaving}>
            <Modal.Body className="px-4 pt-5 pb-4 sm:px-5">
                <form onSubmit={settings.handleSubmit} className="flex flex-col gap-5">
                    {/* Header */}
                    <div className="pr-10">
                        <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('noWithdrawal')}</p>
                    </div>

                    {/* Company */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormFieldLabel label={t('fields.legalName')} required className="sm:col-span-2">
                            <input
                                name="legalName"
                                value={form.legalName}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessLegalNameMaxLength}
                                required
                                autoComplete="organization"
                                aria-invalid={Boolean(fieldErrors.legalName)}
                                className={INPUT_CLASS_NAME}
                            />
                            <FieldError message={fieldErrors.legalName} />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.countryCode')} required>
                            <select
                                name="countryCode"
                                value={form.countryCode}
                                onChange={settings.handleFieldChange}
                                required
                                aria-invalid={Boolean(fieldErrors.countryCode)}
                                className={INPUT_CLASS_NAME}
                            >
                                {settings.countryOptions.map((option) => (
                                    <option key={option.code} value={option.code}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                            <FieldError message={fieldErrors.countryCode} />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.vatNumber')} required>
                            <input
                                name="vatNumber"
                                value={form.vatNumber}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessVatNumberMaxLength}
                                required
                                aria-invalid={Boolean(fieldErrors.vatNumber)}
                                className={`${INPUT_CLASS_NAME} font-mono`}
                            />
                            <FieldError message={fieldErrors.vatNumber} />
                        </FormFieldLabel>
                    </div>

                    {/* Address */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormFieldLabel label={t('fields.addressLine1')} required className="sm:col-span-2">
                            <input
                                name="addressLine1"
                                value={form.addressLine1}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessAddressLineMaxLength}
                                required
                                autoComplete="address-line1"
                                aria-invalid={Boolean(fieldErrors.addressLine1)}
                                className={INPUT_CLASS_NAME}
                            />
                            <FieldError message={fieldErrors.addressLine1} />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.addressLine2')} optional className="sm:col-span-2">
                            <input
                                name="addressLine2"
                                value={form.addressLine2}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessAddressLineMaxLength}
                                autoComplete="address-line2"
                                aria-invalid={Boolean(fieldErrors.addressLine2)}
                                className={INPUT_CLASS_NAME}
                            />
                            <FieldError message={fieldErrors.addressLine2} />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.city')} required>
                            <input
                                name="city"
                                value={form.city}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessCityMaxLength}
                                required
                                autoComplete="address-level2"
                                aria-invalid={Boolean(fieldErrors.city)}
                                className={INPUT_CLASS_NAME}
                            />
                            <FieldError message={fieldErrors.city} />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.postalCode')} required>
                            <input
                                name="postalCode"
                                value={form.postalCode}
                                onChange={settings.handleFieldChange}
                                maxLength={limits.businessPostalCodeMaxLength}
                                required
                                autoComplete="postal-code"
                                aria-invalid={Boolean(fieldErrors.postalCode)}
                                className={INPUT_CLASS_NAME}
                            />
                            <FieldError message={fieldErrors.postalCode} />
                        </FormFieldLabel>
                    </div>

                    {/* Error */}
                    {settings.saveError && (
                        <p role="alert" className="text-sm text-red-600">
                            {settings.saveError}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {settings.profile ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={settings.askRemove}
                                disabled={settings.isSaving}
                                className="gap-2 rounded-full px-3 text-red-600"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('remove')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={settings.closeEditor}
                                disabled={settings.isSaving}
                                className="rounded-full px-4"
                            >
                                {t('cancel')}
                            </Button>
                            <Button type="submit" disabled={settings.isSaving} className="gap-2 rounded-full px-4">
                                {settings.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {settings.isSaving ? t('saving') : t('save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
