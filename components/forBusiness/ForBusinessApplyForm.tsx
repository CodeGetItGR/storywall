'use client';

import { ChevronDown, Loader2, MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Children, type ComponentProps, type ReactNode } from 'react';

import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { useApplyFormSummary } from '@/hooks/useApplyFormSummary';
import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { APPLICATION_ROLES, type ApplyFormDefaults, type CountryOption, type PrefillableApplyField } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { VendorPageSource } from '@/lib/vendorPageTracking';

// The form sits on the landing's white sections and in the vendor page's sheet, so it carries its own ink instead of
// the app's theme tokens. Fields are rows on two grouped surfaces, label on the left, so the form reads short.
const GROUP = 'overflow-hidden rounded-[1.125rem] bg-[#151313]/[0.045] divide-y divide-[#151313]/[0.07]';
const CONTROL = 'min-w-0 flex-1 bg-transparent py-4 text-base text-[#151313] outline-none placeholder:text-[#151313]/35';

type Props = {
    countries: CountryOption[];
    defaultCountry: string;
    defaults?: ApplyFormDefaults;
    search?: string;
    // The public page the form is on, counted when an application is sent. The in-app sheet passes none.
    source?: VendorPageSource;
};

export function ForBusinessApplyForm({ countries, defaultCountry, defaults, search, source }: Props) {
    const t = useTranslations('ForBusinessPage.apply');
    const form = useForBusinessApplication({ search, source });
    const summary = useApplyFormSummary(defaults, form.fieldErrors);

    if (form.isSent) {
        return (
            /* Sent */
            <div role="status">
                <ToolEmptyState title={t('sent.title')} body={t('sent.body')} icon={MailCheck} className="px-0 py-6" />
            </div>
        );
    }

    const fieldError = (name: string) => form.fieldErrors[name];

    return (
        <form onSubmit={form.handleSubmit} className="@container mt-6 flex flex-col gap-3" noValidate={false}>
            {/* Filled from the vendor's details */}
            {summary.collapsed && defaults && <FilledSummary defaults={defaults} fields={summary.filled} onEditAction={summary.edit} />}

            {/* About you */}
            <FieldGroup>
                {summary.showsInput('name') && (
                    <Row label={t('fields.name')} error={fieldError('name')}>
                        <input
                            name="name"
                            required
                            maxLength={200}
                            autoComplete="name"
                            defaultValue={defaults?.name}
                            placeholder={t('placeholders.name')}
                            className={CONTROL}
                            aria-invalid={!!fieldError('name')}
                        />
                    </Row>
                )}
                {summary.showsInput('businessName') && (
                    <Row label={t('fields.businessName')} error={fieldError('businessName')}>
                        <input
                            name="businessName"
                            required
                            maxLength={200}
                            autoComplete="organization"
                            defaultValue={defaults?.businessName}
                            placeholder={t('placeholders.businessName')}
                            className={CONTROL}
                            aria-invalid={!!fieldError('businessName')}
                        />
                    </Row>
                )}
                {summary.showsInput('role') && (
                    <Row label={t('fields.role')} error={fieldError('role')}>
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
                    </Row>
                )}
            </FieldGroup>

            {/* Contact */}
            <FieldGroup>
                {summary.showsInput('email') && (
                    <Row label={t('fields.email')} error={fieldError('email')}>
                        <input
                            name="email"
                            type="email"
                            required
                            maxLength={254}
                            autoComplete="email"
                            defaultValue={defaults?.email}
                            placeholder={t('placeholders.email')}
                            className={CONTROL}
                            aria-invalid={!!fieldError('email')}
                        />
                    </Row>
                )}
                {summary.showsInput('link') && (
                    <Row label={t('fields.link')} error={fieldError('link')}>
                        <input
                            name="link"
                            required
                            maxLength={500}
                            autoComplete="url"
                            defaultValue={defaults?.link}
                            placeholder={t('placeholders.link')}
                            className={CONTROL}
                            aria-invalid={!!fieldError('link')}
                        />
                    </Row>
                )}
                <Row label={t('fields.country')} error={fieldError('countryCode')}>
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
                </Row>
                <Row label={t('fields.phone')} error={fieldError('phone')}>
                    <input
                        name="phone"
                        type="tel"
                        maxLength={40}
                        autoComplete="tel"
                        placeholder={t('placeholders.phone')}
                        className={CONTROL}
                        aria-invalid={!!fieldError('phone')}
                    />
                </Row>
            </FieldGroup>

            {/* Filled values still go with the form while collapsed */}
            {summary.collapsed && summary.filled.map((field) => <input key={field} type="hidden" name={field} value={defaults?.[field] ?? ''} />)}

            {/* Honeypot: hidden from people and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* Consent */}
            <label className="mt-2 flex cursor-pointer items-start gap-3 p-1 text-sm text-[#151313]/80">
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
                className="mt-2 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-0 bg-[#151313] px-6 text-base font-semibold text-white! no-underline transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
            >
                {form.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {t('submit')}
            </button>
            {form.error && (
                <p role="alert" className="text-sm text-red-600">
                    {t(`errors.${form.error}`)}
                </p>
            )}
        </form>
    );
}

// One grouped surface of rows. Renders nothing when every row in it is hidden (all filled in the summary).
function FieldGroup({ children }: { children: ReactNode }) {
    if (Children.toArray(children).length === 0) return null;
    return <div className={GROUP}>{children}</div>;
}

// A field as a row: label on the left, control on the right, its error under both.
function Row({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="flex cursor-text flex-wrap items-center gap-x-3 px-4 transition-colors focus-within:bg-white has-[[aria-invalid=true]]:bg-red-50">
            <span className="w-28 shrink-0 py-4 text-sm leading-tight font-semibold text-[#151313]/65 @md:w-40">{label}</span>
            {children}
            {error && <span className="basis-full pb-3 text-xs text-red-600">{error}</span>}
        </label>
    );
}

// A native select that fills the rest of its row, with a chevron in place of the browser's arrow. The placeholder
// option reads lighter while it is the value.
function Select({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <span className="relative flex min-w-0 flex-1 items-center">
            <select {...props} className={cn(CONTROL, 'w-full cursor-pointer appearance-none pr-7 invalid:text-[#151313]/40', className)}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 size-4 text-[#151313]/50" aria-hidden="true" />
        </span>
    );
}

// The values the vendor's details already filled, with a button that turns them back into fields.
function FilledSummary({
    defaults,
    fields,
    onEditAction,
}: {
    defaults: ApplyFormDefaults;
    fields: PrefillableApplyField[];
    onEditAction: () => void;
}) {
    const t = useTranslations('ForBusinessPage.apply');
    const valueOf = (field: PrefillableApplyField) => (field === 'role' ? t(`roles.${defaults.role}`) : (defaults[field] ?? ''));

    return (
        <div className="flex flex-col items-start gap-3 rounded-[1.125rem] bg-[#151313]/[0.045] p-4">
            <dl className="w-full min-w-0 text-sm leading-relaxed text-[#151313]/70">
                {fields.map((field, index) => (
                    <div key={field}>
                        <dt className="sr-only">{t(`fields.${field}`)}</dt>
                        <dd className={cn('wrap-anywhere', index === 0 && 'text-base font-semibold text-[#151313]')}>{valueOf(field)}</dd>
                    </div>
                ))}
            </dl>
            <button
                type="button"
                onClick={onEditAction}
                className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#151313] shadow-xs ring-1 ring-[#151313]/10 transition-colors hover:bg-[#151313]/[0.04]"
            >
                {t('editDetails')}
            </button>
        </div>
    );
}
