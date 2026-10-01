'use client';

import { useTranslations } from 'next-intl';

import { BusinessProfileFields } from '@/components/profile/BusinessProfileFields';
import type { RegisterBusinessProfile } from '@/hooks/useRegisterBusinessProfile';

const INPUT_CLASS_NAME =
    'min-h-11 w-full rounded-xl bg-surface-muted/70 px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30';

export function RegisterBusinessSection({ business }: { business: RegisterBusinessProfile }) {
    const t = useTranslations('RegisterPage.business');

    return (
        <div className="flex flex-col gap-4">
            {/* Toggle */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1">
                <input
                    type="checkbox"
                    checked={business.isEnabled}
                    onChange={business.handleToggle}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="flex flex-col gap-0.5">
                    <span className="text-sm text-ink">{t('label')}</span>
                    <span className="text-xs text-ink-muted">{t('hint')}</span>
                </span>
            </label>

            {/* Fields */}
            {business.isEnabled && (
                <BusinessProfileFields
                    form={business.form}
                    fieldErrors={business.fieldErrors}
                    countryOptions={business.countryOptions}
                    onFieldChange={business.handleFieldChange}
                    inputClassName={INPUT_CLASS_NAME}
                />
            )}

            {/* Error */}
            {business.sectionError && (
                <p role="alert" className="text-xs text-red-500">
                    {business.sectionError}
                </p>
            )}
        </div>
    );
}
