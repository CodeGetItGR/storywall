'use client';

import { Eye, EyeOff, Loader2, Lock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useResetPassword } from '@/hooks/useResetPassword';
import { routes } from '@/lib/routes';

export function ResetPasswordPageContent() {
    const t = useTranslations('ResetPasswordPage');
    const {
        confirmation,
        error,
        hasToken,
        isSubmitting,
        password,
        showPassword,
        submit,
        togglePasswordVisibility,
        updateConfirmation,
        updatePassword,
    } = useResetPassword();

    return (
        <AuthLayout>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-ink">{hasToken ? t('title') : t('invalidTitle')}</h1>
                <p className="mt-1 text-sm text-ink-muted">{hasToken ? t('subtitle') : t('invalidDescription')}</p>
            </div>

            {hasToken ? (
                <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
                    {/* Password fields */}
                    <FormFieldLabel label={t('fields.password')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <Lock className="size-4 shrink-0 text-ink-muted" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                maxLength={100}
                                autoComplete="new-password"
                                value={password}
                                onChange={updatePassword}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                                className="text-ink-faint transition-colors hover:text-ink-muted"
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                    </FormFieldLabel>
                    <FormFieldLabel label={t('fields.confirmation')} required>
                        <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                            <Lock className="size-4 shrink-0 text-ink-muted" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                maxLength={100}
                                autoComplete="new-password"
                                value={confirmation}
                                onChange={updateConfirmation}
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
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
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        {t('submit')}
                    </button>
                </form>
            ) : (
                /* Invalid link */
                <XCircle aria-hidden="true" className="mt-7 size-10 text-red-500" />
            )}

            {/* Back navigation */}
            <Link href={routes.login} className="mt-6 block text-center text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
                {t('signIn')}
            </Link>
        </AuthLayout>
    );
}
