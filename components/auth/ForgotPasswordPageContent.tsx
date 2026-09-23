'use client';

import { ArrowRight, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import { routes } from '@/lib/routes';

export function ForgotPasswordPageContent() {
    const t = useTranslations('ForgotPasswordPage');
    const { email, error, isSubmitted, isSubmitting, shouldRenderAuthPage, submit, updateEmail } = useForgotPassword();

    if (!shouldRenderAuthPage) return <div className="min-h-screen bg-background" />;

    return (
        <AuthLayout>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
            </div>

            {isSubmitted ? (
                /* Request confirmation */
                <p role="status" className="mt-7 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {t('submitted')}
                </p>
            ) : (
                <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
                    {/* Email */}
                    <FormFieldLabel label={t('fields.email')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <Mail className="size-4 shrink-0 text-ink-muted" />
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder={t('placeholders.email')}
                                value={email}
                                onChange={updateEmail}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                            />
                        </div>
                    </FormFieldLabel>

                    {/* Feedback */}
                    {error && (
                        <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                            {error}
                        </p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                        {t('submit')}
                    </button>
                </form>
            )}

            {/* Back navigation */}
            <Link href={routes.login} className="mt-6 block text-center text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
                {t('signIn')}
            </Link>
        </AuthLayout>
    );
}
