'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PRIMARY_BUTTON } from '@/components/forBusiness/forBusinessStyles';
import { useForBusinessApplication } from '@/hooks/useForBusinessApplication';
import { APPLICATION_ROLES, type CountryOption } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const FIELD =
    'mt-1.5 min-h-12 w-full rounded-xl border border-[#151313]/20 bg-white px-4 text-base outline-none focus:border-[#151313]/60 aria-invalid:border-red-600';
const LABEL = 'block text-sm font-semibold';

type Props = { countries: CountryOption[]; defaultCountry: string };

export function ForBusinessApplyForm({ countries, defaultCountry }: Props) {
    const t = useTranslations('ForBusinessPage.apply');
    const form = useForBusinessApplication();

    if (form.isSent) {
        return (
            <p role="status" className="mt-8 text-lg">
                {t('sent')}
            </p>
        );
    }

    const fieldError = (name: string) => form.fieldErrors[name];

    return (
        <form onSubmit={form.handleSubmit} className="mt-8 grid gap-5" noValidate={false}>
            {/* Identity */}
            <label className={LABEL}>
                {t('fields.name')}
                <input name="name" required maxLength={200} autoComplete="name" className={FIELD} aria-invalid={!!fieldError('name')} />
                {fieldError('name') && <span className="mt-1 block text-xs text-red-600">{fieldError('name')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.businessName')}
                <input
                    name="businessName"
                    required
                    maxLength={200}
                    autoComplete="organization"
                    className={FIELD}
                    aria-invalid={!!fieldError('businessName')}
                />
                {fieldError('businessName') && <span className="mt-1 block text-xs text-red-600">{fieldError('businessName')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.role')}
                <select name="role" required defaultValue="" className={FIELD} aria-invalid={!!fieldError('role')}>
                    <option value="" disabled>
                        {t('rolePlaceholder')}
                    </option>
                    {APPLICATION_ROLES.map((role) => (
                        <option key={role} value={role}>
                            {t(`roles.${role}`)}
                        </option>
                    ))}
                </select>
            </label>
            {/* Contact */}
            <label className={LABEL}>
                {t('fields.email')}
                <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    className={FIELD}
                    aria-invalid={!!fieldError('email')}
                />
                {fieldError('email') && <span className="mt-1 block text-xs text-red-600">{fieldError('email')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.link')}
                <input name="link" required maxLength={500} autoComplete="url" className={FIELD} aria-invalid={!!fieldError('link')} />
                {fieldError('link') && <span className="mt-1 block text-xs text-red-600">{fieldError('link')}</span>}
            </label>
            <label className={LABEL}>
                {t('fields.country')}
                <select
                    name="countryCode"
                    required
                    defaultValue={defaultCountry}
                    autoComplete="country"
                    className={FIELD}
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
                </select>
            </label>
            <label className={LABEL}>
                {t('fields.phone')}
                <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={FIELD} aria-invalid={!!fieldError('phone')} />
                {fieldError('phone') && <span className="mt-1 block text-xs text-red-600">{fieldError('phone')}</span>}
            </label>
            {/* Honeypot: hidden from people and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            {/* Consent */}
            <label className="flex items-start gap-3 text-sm">
                <input name="consent" type="checkbox" required className="mt-0.5 size-5" />
                <span>
                    {t.rich('consent', {
                        link: (chunks) => (
                            <a href={routes.legal.privacy()} target="_blank" rel="noopener" className="underline! underline-offset-2">
                                {chunks}
                            </a>
                        ),
                    })}
                </span>
            </label>
            {/* Submit */}
            <button type="submit" disabled={form.isSubmitting} className={cn(PRIMARY_BUTTON, 'border-0 disabled:opacity-60')}>
                {form.isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : t('submit')}
            </button>
            {form.error && (
                <p role="alert" className="text-sm text-red-600">
                    {t(`errors.${form.error}`)}
                </p>
            )}
        </form>
    );
}
