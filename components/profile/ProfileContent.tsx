'use client';

import { Camera, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProfileBusinessSection } from '@/components/profile/ProfileBusinessSection';
import { ProfileDataSection } from '@/components/profile/ProfileDataSection';
import { ProfileDeleteAccountSection } from '@/components/profile/ProfileDeleteAccountSection';
import { ProfileNewsletterSection } from '@/components/profile/ProfileNewsletterSection';
import { ProfilePasswordSection } from '@/components/profile/ProfilePasswordSection';
import { ProfilePictureDialog } from '@/components/profile/ProfilePictureDialog';
import Avatar from '@/components/ui/avatar';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useProfileForm } from '@/hooks/useProfileForm';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';
import { useUploadAccept } from '@/hooks/useUploadAccept';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function ProfileContent() {
    const t = useTranslations('ProfilePage');
    const uploadAccept = useUploadAccept();
    const limits = useContentLimits();
    const form = useProfileForm();
    const picture = useProfilePictureUpload();
    const displayName = form.accountName || t('fallbackName');

    return (
        <main className="relative h-full overflow-x-hidden overflow-y-auto">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-80 mask-[radial-gradient(ellipse_120%_100%_at_top,black,transparent_70%)] opacity-55 bg-gradient-logo"
            />

            <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8 lg:pt-14">
                {/* Header */}
                <section className="flex flex-col gap-3">
                    <BackButton href={routes.home} label={t('back')} />
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
                            accept={uploadAccept.profilePicture}
                            className="sr-only"
                            onChange={picture.handleFileChange}
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">{displayName}</p>
                            {form.email && <p className="mt-1 truncate text-sm text-ink-muted">{form.email}</p>}
                            {picture.isUpdated && (
                                <p className="mt-1 flex items-center gap-2 text-sm text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                    {t('picture.updated')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Name fields */}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <FormFieldLabel label={t('fields.firstName')} required>
                            <input
                                value={form.firstName}
                                onChange={form.handleFirstNameChange}
                                maxLength={limits.personNameMaxLength}
                                required
                                aria-invalid={Boolean(form.profileFieldErrors.firstName)}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel label={t('fields.lastName')} optional>
                            <input
                                value={form.lastName}
                                onChange={form.handleLastNameChange}
                                maxLength={limits.personNameMaxLength}
                                aria-invalid={Boolean(form.profileFieldErrors.lastName)}
                                className="min-h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                    </div>

                    {/* Profile feedback */}
                    {(form.profileFieldErrors.firstName ||
                        form.profileFieldErrors.lastName ||
                        form.profileError ||
                        form.profileQueryError ||
                        form.profileSuccess) && (
                        <div className="mt-4 space-y-2">
                            {form.profileFieldErrors.firstName && (
                                <p role="alert" className="text-sm text-red-600">
                                    {form.profileFieldErrors.firstName}
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
                            {form.isSavingProfile ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Save className="h-4 w-4" aria-hidden="true" />
                            )}
                            {form.isSavingProfile ? t('saving') : t('save')}
                        </Button>
                    </div>
                </form>

                {/* Profile picture dialog */}
                <ProfilePictureDialog
                    open={picture.isOpen}
                    previewUrl={picture.previewUrl}
                    error={picture.error}
                    isUploading={picture.isUploading}
                    onFileChange={picture.handleFileChange}
                    onConfirm={picture.confirm}
                    onCancel={picture.cancel}
                />

                {/* Password */}
                {form.canChangePassword && <ProfilePasswordSection form={form} />}

                {/* Business details */}
                <ProfileBusinessSection />

                {/* Newsletter */}
                <ProfileNewsletterSection />

                {/* Your data */}
                <ProfileDataSection />

                {/* Delete account */}
                <ProfileDeleteAccountSection />
            </div>
        </main>
    );
}
