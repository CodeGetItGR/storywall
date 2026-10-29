'use client';

import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { APPLICATION_ROLES, type ApplyFormDefaults, type CountryOption } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

// Soft filled fields that turn white with a ring on focus. The form sits on the landing's white sections and in the
// vendor page's sheet, so it carries its own ink instead of the app's theme tokens.
const CONTROL =
    'min-h-13 w-full rounded-[0.875rem] bg-[#151313]/[0.045] px-4 text-base text-[#151313] outline-none ring-1 ring-transparent transition-[background-color,box-shadow] placeholder:text-[#151313]/40 hover:bg-[#151313]/[0.07] focus:bg-white focus:ring-2 focus:ring-[#151313]/70 aria-invalid:bg-red-50 aria-invalid:ring-red-600';

type Props = { countries: CountryOption[]; defaultCountry: string; defaults?: ApplyFormDefaults; search?: string };

export function ForBusinessApplyForm({ countries, defaultCountry, defaults, search }: Props) {
    const t = useTranslations('ForBusinessPage.apply');
    const form = useForBusinessApplication({ search });

    if (form.isSent) {
        return (
            /* Sent */
            <div role="status" className="mt-8 flex flex-col items-center gap-4 rounded-3xl bg-[#151313]/[0.04] px-6 py-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-(image:--logo) text-white shadow-sm">
                    <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <p className="max-w-xs text-lg font-semibold text-[#151313]">{t('sent')}</p>
            </div>
        );
    }

    const fieldError = (name: string) => form.fieldErrors[name];

    return (
        <form onSubmit={form.handleSubmit} className="@container mt-8" noValidate={false}>
            <div className="grid gap-x-4 gap-y-5 @lg:grid-cols-2">
                {/* Identity */}
                <Field label={t('fields.name')} error={fieldError('name')}>
                    <input
                        name="name"
                        required
                        maxLength={200}
                        autoComplete="name"
                        defaultValue={defaults?.name}
                        className={CONTROL}
                        aria-invalid={!!fieldError('name')}
                    />
                </Field>
                <Field label={t('fields.businessName')} error={fieldError('businessName')}>
                    <input
                        name="businessName"
                        required
                        maxLength={200}
                        autoComplete="organization"
                        defaultValue={defaults?.businessName}
                        className={CONTROL}
                        aria-invalid={!!fieldError('businessName')}
                    />
                </Field>
                <Field label={t('fields.role')} className="@lg:col-span-2">
                    <Select name="role" required defaultValue={defaults?.role ?? ''} aria-invalid={!!fieldError('role')}>
                        <option value="" disabled>
                            {t('rolePlaceholder')}
                        </option>
                        {APPLICATION_ROLES.map((role) => (
                            <option key={role} value={role}>
                                {t(`roles.${role}`)}
                            </option>
                        ))}
                    </Select>
                </Field>

                {/* Contact */}
                <Field label={t('fields.email')} error={fieldError('email')}>
                    <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        defaultValue={defaults?.email}
                        className={CONTROL}
                        aria-invalid={!!fieldError('email')}
                    />
                </Field>
                <Field label={t('fields.link')} error={fieldError('link')}>
                    <input
                        name="link"
                        required
                        maxLength={500}
                        autoComplete="url"
                        defaultValue={defaults?.link}
                        className={CONTROL}
                        aria-invalid={!!fieldError('link')}
                    />
                </Field>
                <Field label={t('fields.country')}>
                    <Select
                        name="countryCode"
                        required
                        defaultValue={defaultCountry}
                        autoComplete="country"
                        aria-invalid={!!fieldError('countryCode')}
                    >
                        <option value="" disabled>
                            {t('countryPlaceholder')}
                        </option>
                        {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                                {country.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('fields.phone')} error={fieldError('phone')}>
                    <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={CONTROL} aria-invalid={!!fieldError('phone')} />
                </Field>
            </div>

            {/* Honeypot: hidden from people and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* Consent */}
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl p-1 text-sm text-[#151313]/80">
                <input name="consent" type="checkbox" required className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#151313]" />
                <span>
                    {t.rich('consent', {
                        link: (chunks) => (
                            <a
                                href={routes.legal.privacy()}
                                target="_blank"
                                rel="noopener"
                                className="font-semibold text-[#151313]! underline! underline-offset-2"
                            >
                                {chunks}
                            </a>
                        ),
                    })}
                </span>
            </label>

            {/* Submit */}
            <button
                type="submit"
                disabled={form.isSubmitting}
                className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-0 bg-[#151313] px-6 text-base font-semibold text-white! no-underline transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
            >
                {form.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {t('submit')}
            </button>
            {form.error && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                    {t(`errors.${form.error}`)}
                </p>
            )}
        </form>
    );
}

// A label above its control, with the field's error under it.
function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
    return (
        <label className={cn('block', className)}>
            <span className="mb-1.5 block text-sm font-semibold text-[#151313]/75">{label}</span>
            {children}
            {error && <span className="mt-1.5 block text-xs text-red-600">{error}</span>}
        </label>
    );
}

// A native select with the same look as the inputs and a chevron in place of the browser's arrow.
function Select({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <span className="relative block">
            <select {...props} className={cn(CONTROL, 'cursor-pointer appearance-none pr-11', className)}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-[#151313]/60" aria-hidden="true" />
        </span>
    );
}
