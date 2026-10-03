'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { useProfileForm } from '@/hooks/useProfileForm';

const PASSWORD_FORM_ID = 'profile-password-form';

const inputClassName =
    'min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

type ProfilePasswordSectionProps = {
    form: ReturnType<typeof useProfileForm>;
};

export function ProfilePasswordSection({ form }: ProfilePasswordSectionProps) {
    const t = useTranslations('ProfilePage.password');
    const limits = useContentLimits();

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Password header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                </div>
                {!form.isPasswordOpen && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={form.openPasswordForm}
                        aria-expanded={false}
                        aria-controls={PASSWORD_FORM_ID}
                        className="rounded-full px-3"
                    >
                        {t('open')}
                    </Button>
                )}
            </div>

            {form.isPasswordOpen && (
                <form id={PASSWORD_FORM_ID} onSubmit={form.handlePasswordSubmit}>
                    {/* Password note */}
                    <p className="mt-2 text-sm text-ink-muted">{t('signOutNotice')}</p>

                    {/* Password fields */}
                    <div className="mt-5 grid gap-4">
                        <FormFieldLabel label={t('current')} required>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={form.currentPassword}
                                onChange={form.handleCurrentPasswordChange}
                                minLength={limits.passwordMinLength}
                                maxLength={limits.passwordMaxLength}
                                required
                                aria-invalid={Boolean(form.passwordFieldErrors.currentPassword)}
                                className={inputClassName}
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('new')} required>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.newPassword}
                                onChange={form.handleNewPasswordChange}
                                minLength={limits.passwordMinLength}
                                maxLength={limits.passwordMaxLength}
                                required
                                aria-invalid={Boolean(form.passwordFieldErrors.newPassword)}
                                className={inputClassName}
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('confirm')} required>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={form.confirmPassword}
                                onChange={form.handleConfirmPasswordChange}
                                minLength={limits.passwordMinLength}
                                maxLength={limits.passwordMaxLength}
                                required
                                aria-invalid={Boolean(form.passwordFieldErrors.confirmPassword)}
                                className={inputClassName}
                            />
                        </FormFieldLabel>
                    </div>

                    {/* Password feedback */}
                    {(form.passwordFieldErrors.currentPassword ||
                        form.passwordFieldErrors.newPassword ||
                        form.passwordFieldErrors.confirmPassword ||
                        form.passwordError) && (
                        <div className="mt-4 space-y-2">
                            {form.passwordFieldErrors.currentPassword === 'invalid' ? (
                                <p role="alert" className="text-sm text-red-600">
                                    {t('errors.currentPasswordInvalid')}
                                </p>
                            ) : (
                                form.passwordFieldErrors.currentPassword && (
                                    <p role="alert" className="text-sm text-red-600">
                                        {form.passwordFieldErrors.currentPassword}
                                    </p>
                                )
                            )}
                            {form.passwordFieldErrors.newPassword && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.passwordFieldErrors.newPassword}
                                </p>
                            )}
                            {form.passwordFieldErrors.confirmPassword === 'mismatch' && (
                                <p role="alert" className="text-sm text-red-600">
                                    {t('errors.confirmMismatch')}
                                </p>
                            )}
                            {form.passwordError === 'noPassword' ? (
                                <p role="alert" className="text-sm text-red-600">
                                    {t('errors.noPassword')}
                                </p>
                            ) : (
                                form.passwordError && (
                                    <p role="alert" className="text-sm text-red-600">
                                        {form.passwordError}
                                    </p>
                                )
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={form.closePasswordForm}
                            disabled={form.isSavingPassword}
                            className="rounded-full px-4"
                        >
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={form.isSavingPassword || form.passwordMismatch} className="gap-2 rounded-full px-4">
                            {form.isSavingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <KeyRound className="h-4 w-4" aria-hidden="true" />
                            )}
                            {form.isSavingPassword ? t('saving') : t('submit')}
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}
