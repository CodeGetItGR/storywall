'use client';

import { Camera, KeyRound, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import Avatar from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useProfileForm } from '@/hooks/useProfileForm';
import { getInitials } from '@/lib/format';

export function ProfileContent() {
    const t = useTranslations('ProfilePage');
    const form = useProfileForm();
    const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || t('fallbackName');

    function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        form.updateProfilePhoto(event.target.files?.[0] ?? null);
    }

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
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink">{t('title')}</h1>
                </section>

                {/* Personal info */}
                <form
                    onSubmit={form.handlePersonalInfoSubmit}
                    className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5"
                >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <Avatar
                            src={form.profilePhotoUrl}
                            initials={getInitials(displayName)}
                            size="2xl"
                            alt={displayName}
                            className="ring-2 ring-primary/20"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{displayName}</p>
                            {form.email && <p className="mt-1 truncate text-sm text-ink-muted">{form.email}</p>}
                            <label className="mt-3 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-primary-light hover:text-primary-dark">
                                <Camera className="h-4 w-4" aria-hidden="true" />
                                <span>{t('fields.photo')}</span>
                                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                            </label>
                        </div>
                    </div>

                    {/* Name fields */}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <FormFieldLabel label={t('fields.firstName')}>
                            <input
                                value={form.firstName}
                                onChange={form.handleFirstNameChange}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.lastName')}>
                            <input
                                value={form.lastName}
                                onChange={form.handleLastNameChange}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex justify-end">
                        <Button type="submit" disabled className="gap-2 rounded-full px-4">
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {t('save')}
                        </Button>
                    </div>
                </form>

                {/* Password */}
                <form onSubmit={form.handlePasswordSubmit} className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                        <h2 className="text-base font-semibold text-ink">{t('password.title')}</h2>
                    </div>

                    {/* Password fields */}
                    <div className="mt-5 grid gap-4">
                        <FormFieldLabel label={t('password.current')}>
                            <input
                                type="password"
                                value={form.currentPassword}
                                onChange={form.handleCurrentPasswordChange}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('password.new')}>
                            <input
                                type="password"
                                value={form.newPassword}
                                onChange={form.handleNewPasswordChange}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('password.confirm')}>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={form.handleConfirmPasswordChange}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex justify-end">
                        <Button type="submit" disabled className="gap-2 rounded-full px-4">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                            {t('password.submit')}
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}
