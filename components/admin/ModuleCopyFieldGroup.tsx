'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import type { AdminErrorMessageKey } from '@/lib/adminUtils';
import { MODULE_COPY_LOCALES, MODULE_COPY_MAX_LENGTH, type ModuleCopyField, type ModuleCopyLocale } from '@/lib/planModules';

// One overridable field (name, description or card line) in English and Greek.
export function ModuleCopyFieldGroup({
    field,
    values,
    placeholders,
    hint,
    errorFor,
    onChangeAction,
}: {
    field: ModuleCopyField;
    values: Record<ModuleCopyLocale, string>;
    placeholders?: Partial<Record<ModuleCopyLocale, string>>;
    hint?: string;
    errorFor: (field: ModuleCopyField, locale: ModuleCopyLocale) => AdminErrorMessageKey | null;
    onChangeAction: (field: ModuleCopyField, locale: ModuleCopyLocale, value: string) => void;
}) {
    const t = useTranslations('AdminPage.eventTypes.moduleCopy');
    const tErrors = useTranslations('AdminPage.errors');
    const localeLabel: Record<ModuleCopyLocale, string> = { en: t('english'), el: t('greek') };
    const maxLength = MODULE_COPY_MAX_LENGTH[field];

    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">{t(field)}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                {MODULE_COPY_LOCALES.map((locale) => {
                    const error = errorFor(field, locale);
                    const inputProps = {
                        value: values[locale],
                        maxLength,
                        placeholder: placeholders?.[locale],
                        'aria-invalid': error ? true : undefined,
                        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            onChangeAction(field, locale, event.target.value),
                    };
                    return (
                        <AdminField key={locale} label={localeLabel[locale]}>
                            {field === 'description' ? (
                                <textarea rows={3} {...inputProps} className={adminInputClass('resize-y')} />
                            ) : (
                                <input type="text" {...inputProps} className={adminInputClass()} />
                            )}
                            {error && <span className="text-xs text-status-danger">{tErrors(error)}</span>}
                        </AdminField>
                    );
                })}
            </div>
            {hint && <p className="text-[11px] leading-4 text-ink-faint">{hint}</p>}
        </fieldset>
    );
}
