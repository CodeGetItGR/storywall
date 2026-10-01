'use client';

import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import type { ProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { ProvisionHost } from '@/lib/adminAccountProvisioning';
import { routes } from '@/lib/routes';

export function ProvisionEventSuccess({ form, host, showOpenEvent = false }: { form: ProvisionEventForm; host: ProvisionHost; showOpenEvent?: boolean }) {
    const t = useTranslations('AdminPage.accounts.provision');
    if (!form.result) return null;
    const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || host.email || t('unnamedHost');

    return (
        <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            {/* Success */}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good-wash text-status-good">
                <CheckCircle2 className="h-6 w-6" />
            </span>
            <span className="mt-4 rounded-full bg-status-good-wash px-2.5 py-1 text-[11px] font-bold text-status-good">{t('active')}</span>
            <h3 className="mt-3 text-xl font-bold text-ink">{form.result.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('hostedBy', { host: hostName })}</p>
            <div className="mt-6 w-full max-w-sm border-t border-border pt-5 text-left">
                <p className="mb-4 text-sm text-ink-muted">{t('successBody', { plan: form.selectedPlan?.name ?? '' })}</p>
                <AdminIdentifier label={t('eventId')} value={form.result.id} />
                {showOpenEvent && (
                    <a
                        href={routes.events.feed(form.result.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted hover:bg-canvas"
                    >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('openEvent')}
                    </a>
                )}
            </div>
        </section>
    );
}
