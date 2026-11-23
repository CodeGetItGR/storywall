'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';
import { VendorListRow } from '@/components/vendors/list/VendorListRow';
import { VendorCardsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useAskDates } from '@/hooks/useAskDates';
import { useVendorList } from '@/hooks/useVendorList';
import type { VendorRowDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export function VendorListScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const { vendors, isLoading, openVendor } = useVendorList(eventId);
    const ask = useAskDates(eventId);
    const { openForVendor } = ask;
    const askVendor = useCallback((vendor: VendorRowDto) => openForVendor(vendor.id, vendor.businessName ?? ''), [openForVendor]);

    return (
        <ModulePageShell maxWidth="2xl" title={t('list.title')} icon={Store} backLabel={t('list.back')} backHref={routes.events.feed(eventId)}>
            {/* List */}
            {isLoading ? (
                <VendorCardsSkeleton />
            ) : vendors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('list.empty')}</p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                    {vendors.map((vendor) => (
                        <VendorListRow key={vendor.id} vendor={vendor} onOpenAction={openVendor} onAskAction={askVendor} />
                    ))}
                </ul>
            )}

            {/* Ask sheet */}
            {ask.target && (
                <AskDatesSheet
                    name={ask.target.name}
                    date={ask.date}
                    phone={ask.phone}
                    email={ask.email}
                    note={ask.note}
                    consent={ask.consent}
                    dateBounds={ask.dateBounds}
                    dateError={ask.dateError}
                    contactError={ask.contactError}
                    sendError={ask.sendError}
                    sent={ask.sent}
                    isSending={ask.isSending}
                    canSend={ask.canSend}
                    onDateChangeAction={ask.setDate}
                    onPhoneChangeAction={ask.setPhone}
                    onEmailChangeAction={ask.setEmail}
                    onNoteChangeAction={ask.setNote}
                    onConsentChangeAction={ask.setConsent}
                    onSubmitAction={ask.submit}
                    onCloseAction={ask.close}
                />
            )}
        </ModulePageShell>
    );
}
