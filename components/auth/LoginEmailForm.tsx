'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { useLoginForm } from '@/hooks/useLoginForm';
import { routes } from '@/lib/routes';

type Props = {
    form: ReturnType<typeof useLoginForm>;
    // Above the fields (the login page's "password changed" notes).
    status?: ReactNode;
    // The wizard keeps its place: the reset page opens in a new tab.
    forgotPasswordInNewTab?: boolean;
    // The wizard's own button; the page keeps its gradient one.
    submitButton?: ReactNode;
};

// The sign-in email form, shared by the login page and the create wizard.
export function LoginEmailForm({ form, status, forgotPasswordInNewTab = false, submitButton }: Props) {
    const t = useTranslations('LoginPage');
    const limits = useContentLimits();

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            {/* Status */}
            {status}

            {/* Email */}
            <FormFieldLabel label={t('fields.email')} required>
                <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                    <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
                    <input
                        type="email"
                        placeholder={t('placeholders.email')}
                        required
                        maxLength={limits.emailMaxLength}
                        value={form.email}
                        onChange={form.handleEmailChange}
                        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                    />
                </div>
            </FormFieldLabel>

            {/* Password */}
            <FormFieldLabel label={t('fields.password')} required>
                <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                    <Lock className="h-4 w-4 shrink-0 text-ink-muted" />
                    <input
                        type={form.showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        required
                        minLength={limits.passwordMinLength}
                        maxLength={limits.passwordMaxLength}
                        value={form.password}
                        onChange={form.handlePasswordChange}
                        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                    />
                    <button
                        type="button"
                        onClick={form.handleTogglePassword}
                        aria-label={form.showPassword ? t('hidePassword') : t('showPassword')}
                        className="text-ink-faint transition-colors hover:text-ink-muted"
                    >
                        {form.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </FormFieldLabel>

            {/* Password recovery */}
            <AppLink
                href={routes.forgotPassword}
                target={forgotPasswordInNewTab ? '_blank' : undefined}
                rel={forgotPasswordInNewTab ? 'noopener' : undefined}
                className="-mt-2 self-end text-xs font-semibold text-ink-muted transition-colors hover:text-ink hover:underline"
            >
                {t('forgotPassword')}
            </AppLink>

            {/* Feedback */}
            {form.error && (
                <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                    {form.error}
                </p>
            )}

            {/* Actions */}
            {submitButton ?? (
                <button
                    type="submit"
                    disabled={form.isSubmitting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            )}
        </form>
    );
}
