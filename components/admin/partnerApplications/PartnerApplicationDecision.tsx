'use client';

import { Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationDecision({
    application,
    decision,
    partnerHash,
}: {
    application: AdminPartnerApplicationDto;
    decision: string;
    partnerHash: string | null;
}) {
    const t = useTranslations('AdminPage.partnerApplications');

    return (
        <section className="space-y-2 border-t border-border pt-5">
            {/* Decision */}
            <p className="text-sm text-ink-muted">{decision}</p>

            {/* Reason */}
            {application.status === 'DECLINED' && (
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold text-ink-faint">{t('reasonSent')}</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-ink">{application.declineReason ?? t('noReason')}</p>
                </div>
            )}

            {/* Partner */}
            {partnerHash && (
                <a
                    href={partnerHash}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
                >
                    <Handshake className="h-4 w-4" aria-hidden="true" />
                    {t('openPartner')}
                </a>
            )}
        </section>
    );
}
