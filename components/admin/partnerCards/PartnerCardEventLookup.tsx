'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { PartnerCardEventLink } from '@/components/admin/partnerCards/PartnerCardEventLink';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerCardEventLookup } from '@/hooks/usePartnerCards';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Find an event by id, then link, replace or remove its partner.
export function PartnerCardEventLookup() {
    const t = useTranslations('AdminPage.partnerCards.event');
    const tAdmin = useTranslations('AdminPage');
    const lookup = usePartnerCardEventLookup();

    return (
        <section className="space-y-4">
            {/* Heading */}
            <h3 className="text-base font-semibold text-ink">{t('title')}</h3>

            {/* Lookup */}
            <form onSubmit={lookup.handleSubmit} noValidate className="flex max-w-xl flex-wrap items-start gap-2">
                <label className="min-w-0 flex-1">
                    <span className="sr-only">{t('idLabel')}</span>
                    <input
                        value={lookup.input}
                        onChange={lookup.handleInputChange}
                        placeholder={t('idLabel')}
                        aria-invalid={lookup.invalid}
                        className={adminInputClass('font-mono')}
                    />
                </label>
                <button
                    type="submit"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    {t('lookup')}
                </button>
            </form>
            {lookup.invalid && <p className="text-sm text-status-danger">{t('invalidId')}</p>}

            {/* Result */}
            {lookup.eventId && (
                <div className="max-w-xl rounded-xl border border-border bg-card p-4">
                    {lookup.link.isLoading && <LoadingState label={t('loading')} className="min-h-24" />}
                    {lookup.link.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(lookup.link.error)}`)}</p>}
                    {lookup.link.data !== undefined && !lookup.link.error && (
                        <PartnerCardEventLink key={lookup.eventId} eventId={lookup.eventId} link={lookup.link.data} />
                    )}
                </div>
            )}
        </section>
    );
}
