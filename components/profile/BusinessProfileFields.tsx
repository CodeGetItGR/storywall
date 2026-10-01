'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { BusinessProfileField, BusinessProfileForm } from '@/lib/businessProfile';
import { cn } from '@/lib/utils';

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

// The business profile inputs, shared by the profile dialog and signup.
export function BusinessProfileFields({
    form,
    fieldErrors,
    countryOptions,
    onFieldChange,
    inputClassName = INPUT_CLASS_NAME,
}: {
    form: BusinessProfileForm;
    fieldErrors: Partial<Record<BusinessProfileField, string>>;
    countryOptions: { code: string; name: string }[];
    onFieldChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    inputClassName?: string;
}) {
    const t = useTranslations('ProfilePage.business');
    const limits = useContentLimits();

    return (
        <>
            {/* Company */}
            <div className="grid gap-4 sm:grid-cols-2">
                <FormFieldLabel label={t('fields.legalName')} required className="sm:col-span-2">
                    <input
                        name="legalName"
                        value={form.legalName}
                        onChange={onFieldChange}
                        maxLength={limits.businessLegalNameMaxLength}
                        required
                        autoComplete="organization"
                        aria-invalid={Boolean(fieldErrors.legalName)}
                        className={inputClassName}
                    />
                    <FieldError message={fieldErrors.legalName} />
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.countryCode')} required>
                    <select
                        name="countryCode"
                        value={form.countryCode}
                        onChange={onFieldChange}
                        required
                        aria-invalid={Boolean(fieldErrors.countryCode)}
                        className={inputClassName}
                    >
                        {countryOptions.map((option) => (
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
                        onChange={onFieldChange}
                        maxLength={limits.businessVatNumberMaxLength}
                        required
                        aria-invalid={Boolean(fieldErrors.vatNumber)}
                        className={cn(inputClassName, 'font-mono')}
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
                        onChange={onFieldChange}
                        maxLength={limits.businessAddressLineMaxLength}
                        required
                        autoComplete="address-line1"
                        aria-invalid={Boolean(fieldErrors.addressLine1)}
                        className={inputClassName}
                    />
                    <FieldError message={fieldErrors.addressLine1} />
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.addressLine2')} optional className="sm:col-span-2">
                    <input
                        name="addressLine2"
                        value={form.addressLine2}
                        onChange={onFieldChange}
                        maxLength={limits.businessAddressLineMaxLength}
                        autoComplete="address-line2"
                        aria-invalid={Boolean(fieldErrors.addressLine2)}
                        className={inputClassName}
                    />
                    <FieldError message={fieldErrors.addressLine2} />
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.city')} required>
                    <input
                        name="city"
                        value={form.city}
                        onChange={onFieldChange}
                        maxLength={limits.businessCityMaxLength}
                        required
                        autoComplete="address-level2"
                        aria-invalid={Boolean(fieldErrors.city)}
                        className={inputClassName}
                    />
                    <FieldError message={fieldErrors.city} />
                </FormFieldLabel>
                <FormFieldLabel label={t('fields.postalCode')} required>
                    <input
                        name="postalCode"
                        value={form.postalCode}
                        onChange={onFieldChange}
                        maxLength={limits.businessPostalCodeMaxLength}
                        required
                        autoComplete="postal-code"
                        aria-invalid={Boolean(fieldErrors.postalCode)}
                        className={inputClassName}
                    />
                    <FieldError message={fieldErrors.postalCode} />
                </FormFieldLabel>
            </div>
        </>
    );
}
