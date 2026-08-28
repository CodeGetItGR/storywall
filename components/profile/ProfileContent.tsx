'use client';

import { Camera, CheckCircle2, KeyRound, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useProfileForm } from '@/hooks/useProfileForm';
import { getInitials } from '@/lib/format';

export function ProfileContent() {
    const t = useTranslations('ProfilePage');
    const form = useProfileForm();
    const displayName = form.accountName || t('fallbackName');

    return (
        <main className="relative h-full overflow-y-auto overflow-x-hidden">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="bg-gradient-logo pointer-events-none absolute inset-x-0 top-0 h-80 opacity-55 mask-[radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)]"
            />

            <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8 lg:pt-14">
                {/* Header */}
                <section>
                    <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                </section>

                {/* Personal info */}
                <form
                    onSubmit={form.handlePersonalInfoSubmit}
                    className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5"
                >
                    {/* Identity */}
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <label htmlFor="profile-picture-input" className="group relative cursor-pointer self-start">
                            <Avatar
                                src={form.profilePictureUrl}
                                initials={getInitials(displayName)}
                                size="2xl"
                                alt={displayName}
                                className="ring-2 ring-primary/20 transition group-hover:brightness-75"
                            />
                            <span className="pointer-events-none absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-sm transition group-hover:scale-105">
                                <Camera className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                                {t('picture.change')}
                            </span>
                        </label>
                        <input
                            id="profile-picture-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={form.handleProfilePictureChange}
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{displayName}</p>
                            {form.email && <p className="mt-1 truncate text-sm text-ink-muted">{form.email}</p>}
                            {form.isSavingProfilePicture && <p className="mt-1 text-sm text-ink-muted">{t('picture.saving')}</p>}
                        </div>
                    </div>

                    {/* Name fields */}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <FormFieldLabel label={t('fields.displayName')} required>
                            <input
                                value={form.displayName}
                                onChange={form.handleDisplayNameChange}
                                maxLength={100}
                                required
                                aria-invalid={Boolean(form.profileFieldErrors.displayName)}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.lastName')} optional>
                            <input
                                value={form.lastName}
                                onChange={form.handleLastNameChange}
                                maxLength={100}
                                aria-invalid={Boolean(form.profileFieldErrors.lastName)}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                    </div>

                    {/* Profile feedback */}
                    {(form.profileFieldErrors.displayName || form.profileFieldErrors.lastName || form.profileError || form.profileQueryError || form.profileSuccess) && (
                        <div className="mt-4 space-y-2">
                            {form.profileFieldErrors.displayName && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.profileFieldErrors.displayName}
                                </p>
                            )}
                            {form.profileFieldErrors.lastName && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.profileFieldErrors.lastName}
                                </p>
                            )}
                            {form.profileError && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.profileError}
                                </p>
                            )}
                            {form.profileQueryError && !form.profileError && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.profileQueryError}
                                </p>
                            )}
                            {form.profileSuccess === 'updated' && (
                                <p className="flex items-center gap-2 text-sm text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                    {t('profileUpdated')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex justify-end">
                        <Button type="submit" disabled={!form.hasProfileChanges || form.isSavingProfile} className="gap-2 rounded-full px-4">
                            {form.isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                            {form.isSavingProfile ? t('saving') : t('save')}
                        </Button>
                    </div>
                </form>

                {/* Password */}
                {form.canChangePassword && (
                    <form onSubmit={form.handlePasswordSubmit} className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
                        {/* Password header */}
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                            <h2 className="text-base font-semibold text-ink">{t('password.title')}</h2>
                        </div>

                        {/* Password note */}
                        <p className="mt-2 text-sm text-ink-muted">{t('password.signOutNotice')}</p>

                        {/* Password fields */}
                        <div className="mt-5 grid gap-4">
                            <FormFieldLabel label={t('password.current')} required>
                                <input
                                    type="password"
                                    value={form.currentPassword}
                                    onChange={form.handleCurrentPasswordChange}
                                    minLength={8}
                                    maxLength={100}
                                    required
                                    aria-invalid={Boolean(form.passwordFieldErrors.currentPassword)}
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                />
                            </FormFieldLabel>
                            <FormFieldLabel label={t('password.new')} required>
                                <input
                                    type="password"
                                    value={form.newPassword}
                                    onChange={form.handleNewPasswordChange}
                                    minLength={8}
                                    maxLength={100}
                                    required
                                    aria-invalid={Boolean(form.passwordFieldErrors.newPassword)}
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                />
                            </FormFieldLabel>
                            <FormFieldLabel label={t('password.confirm')} required>
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={form.handleConfirmPasswordChange}
                                    minLength={8}
                                    maxLength={100}
                                    required
                                    aria-invalid={Boolean(form.passwordFieldErrors.confirmPassword)}
                                    className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
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
                                        {t('password.errors.currentPasswordInvalid')}
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
                                        {t('password.errors.confirmMismatch')}
                                    </p>
                                )}
                                {form.passwordError === 'noPassword' ? (
                                    <p role="alert" className="text-sm text-red-600">
                                        {t('password.errors.noPassword')}
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
                        <div className="mt-5 flex justify-end">
                            <Button type="submit" disabled={form.isSavingPassword || form.passwordMismatch} className="gap-2 rounded-full px-4">
                                {form.isSavingPassword ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                )}
                                {form.isSavingPassword ? t('password.saving') : t('password.submit')}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
