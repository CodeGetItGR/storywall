'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminGuestOfferStats } from '@/components/admin/AdminGuestOfferStats';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminGuestOffer } from '@/hooks/useAdminGuestOffer';

// The guest offer card's terms: on/off, discount and how long a claimed code lasts.
export function AdminGuestOfferPanel() {
    const t = useTranslations('AdminPage.guestOffer');
    const tAdmin = useTranslations('AdminPage');
    const form = useAdminGuestOffer();

    return (
        <div className="mx-auto max-w-3xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5">
                <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('description')}</p>
            </header>

            {/* Stats */}
            <AdminGuestOfferStats />

            {form.isLoading && <LoadingState label={t('loading')} className="justify-start" />}
            {form.loadFailed && (
                <p role="alert" className="text-sm text-red-600">
                    {t('loadFailed')}
                </p>
            )}

            {form.draft && (
                <>
                    {/* Terms */}
                    <form onSubmit={form.submit} className="rounded-xl border border-border bg-card">
                        <AdminSwitch label={t('enabled')} checked={form.draft.enabled} onCheckedChangeAction={form.setEnabled} />

                        <div className="grid gap-4 border-t border-border/70 p-3 sm:grid-cols-2">
                            <AdminField label={t('percent')} hint={form.percentInvalid ? t('percentInvalid') : undefined}>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={99}
                                    value={form.draft.discountPercent}
                                    onChange={form.setDiscountPercent}
                                    aria-invalid={form.percentInvalid}
                                    className={adminInputClass('font-mono')}
                                />
                            </AdminField>
                            <AdminField label={t('months')} hint={form.monthsInvalid ? t('monthsInvalid') : undefined}>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={60}
                                    value={form.draft.validityMonths}
                                    onChange={form.setValidityMonths}
                                    aria-invalid={form.monthsInvalid}
                                    className={adminInputClass('font-mono')}
                                />
                            </AdminField>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-3">
                            <p className="text-xs text-ink-muted">{t('appliesToNew')}</p>
                            <div className="flex items-center gap-3">
                                {form.saveFailed && (
                                    <p role="alert" className="text-sm text-red-600">
                                        {t('saveFailed')}
                                    </p>
                                )}
                                {form.saved && (
                                    <p role="status" className="text-sm text-status-good">
                                        {t('saved')}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={!form.canSave}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                                >
                                    {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
