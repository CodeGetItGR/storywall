'use client';

import { Briefcase, Pencil, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessProfileDialog } from '@/components/profile/BusinessProfileDialog';
import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useBusinessProfileSettings } from '@/hooks/useBusinessProfile';
import { formatVatNumber } from '@/lib/businessProfile';
import { cn } from '@/lib/utils';

export function ProfileBusinessSection() {
    const t = useTranslations('ProfilePage.business');
    const settings = useBusinessProfileSettings();
    if (!settings.canHaveProfile) return null;

    const { profile } = settings;

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Business header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
                </div>
                {profile && (
                    <Button type="button" variant="outline" onClick={settings.openEditor} className="gap-2 rounded-full px-3">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        {t('edit')}
                    </Button>
                )}
            </div>

            {settings.isLoading && <LoadingState label={t('loading')} className="mt-4 justify-start" />}
            {settings.loadError && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                    {settings.loadError}
                </p>
            )}

            {/* Empty */}
            {!settings.isLoading && !settings.loadError && !profile && (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink-muted">{t('empty')}</p>
                    <Button type="button" onClick={settings.openEditor} className="gap-2 self-start rounded-full px-4 sm:self-auto">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('add')}
                    </Button>
                </div>
            )}

            {profile && (
                <>
                    {/* Details */}
                    <div className="mt-3 text-sm text-ink">
                        <p className="font-semibold">{profile.legalName}</p>
                        <p className="font-mono text-ink-muted">{t('vat', { vatNumber: formatVatNumber(profile) })}</p>
                        <p className="mt-1 text-ink-muted">{[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ')}</p>
                        <p className="text-ink-muted">
                            {profile.postalCode} {profile.city}, {settings.countryName}
                        </p>
                    </div>

                    {/* VIES status */}
                    <p
                        role="status"
                        className={cn(
                            'mt-4 rounded-2xl px-4 py-3 text-sm',
                            profile.viesStatus === 'VALID' && 'bg-emerald-50 text-emerald-800',
                            profile.viesStatus === 'PENDING' && 'bg-amber-50 text-amber-800',
                            profile.viesStatus === 'INVALID' && 'bg-red-50 text-red-700',
                        )}
                    >
                        {t(`status.${profile.viesStatus}`)}
                    </p>
                </>
            )}

            {/* Edit dialog */}
            <BusinessProfileDialog settings={settings} />

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={settings.isConfirmingRemove}
                title={t('removeTitle')}
                body={
                    <>
                        {t('removeBody')}
                        {settings.removeError && (
                            <span role="alert" className="mt-2 block text-red-600">
                                {settings.removeError}
                            </span>
                        )}
                    </>
                }
                confirmLabel={t('removeConfirm')}
                cancelLabel={t('removeCancel')}
                onCloseAction={settings.cancelRemove}
                onConfirmAction={settings.confirmRemove}
                isConfirming={settings.isRemoving}
            />
        </section>
    );
}
