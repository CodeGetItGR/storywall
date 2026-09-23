'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { ProvisionEventForm } from '@/components/admin/ProvisionEventForm';
import { ProvisionEventReview } from '@/components/admin/ProvisionEventReview';
import { ProvisionEventSuccess } from '@/components/admin/ProvisionEventSuccess';
import { useProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { UserResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const FORM_ID = 'provision-admin-event';

export function EventProvisionDrawer({ host, onCloseAction }: { host: UserResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const form = useProvisionEventForm(host);
    const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || host.email || t('unnamedHost');

    function handleBack() {
        form.setStep('event');
    }

    const footer =
        form.step === 'success' ? (
            <div className="flex w-full items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={form.provisionAnother}
                    className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas"
                >
                    {t('another')}
                </button>
                <button
                    type="button"
                    onClick={onCloseAction}
                    className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
                >
                    {t('done')}
                </button>
            </div>
        ) : (
            <div className="flex w-full items-center justify-between gap-3">
                {form.step === 'review' ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-canvas"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('back')}
                    </button>
                ) : (
                    <span />
                )}
                <button
                    type="submit"
                    form={FORM_ID}
                    disabled={!form.canReview || form.isPending}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {form.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {form.step === 'review' ? (form.isPending ? t('provisioning') : t('submit')) : t('review')}
                </button>
            </div>
        );

    return (
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('title')}
            subtitle={t('subtitle', { host: hostName })}
            footer={footer}
        >
            {form.step === 'success' ? (
                <ProvisionEventSuccess form={form} host={host} />
            ) : (
                <form id={FORM_ID} onSubmit={form.submit} className="space-y-7">
                    {/* Progress */}
                    <nav aria-label={t('progressLabel')} className="flex items-center gap-3 text-xs font-bold">
                        <span
                            className={cn(
                                'rounded-full px-3 py-1.5',
                                form.step === 'event' ? 'bg-primary-light text-primary-dark' : 'bg-canvas text-ink-muted',
                            )}
                        >
                            {t('stepEvent')}
                        </span>
                        <span className="h-px w-8 bg-border" />
                        <span
                            className={cn(
                                'rounded-full px-3 py-1.5',
                                form.step === 'review' ? 'bg-primary-light text-primary-dark' : 'bg-canvas text-ink-faint',
                            )}
                        >
                            {t('stepReview')}
                        </span>
                    </nav>

                    {/* Selected host */}
                    <section className="flex items-center justify-between gap-4 rounded-lg bg-canvas px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold tracking-wide text-ink-faint uppercase">{t('host')}</p>
                            <p className="truncate text-sm font-semibold text-ink">{hostName}</p>
                        </div>
                        <p className="truncate text-xs text-ink-faint">{host.email}</p>
                    </section>

                    {form.step === 'event' ? <ProvisionEventForm form={form} /> : <ProvisionEventReview form={form} host={host} />}
                </form>
            )}
        </AdminDrawer>
    );
}
