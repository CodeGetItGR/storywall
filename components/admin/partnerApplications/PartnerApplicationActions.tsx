'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ApprovePartnerApplicationModal } from '@/components/admin/partnerApplications/ApprovePartnerApplicationModal';
import { DeclinePartnerApplicationModal } from '@/components/admin/partnerApplications/DeclinePartnerApplicationModal';
import { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';
import { usePartnerApplicationDecline } from '@/hooks/usePartnerApplicationDecline';
import type { AdminPartnerApplicationDto } from '@/lib/api/types';

export function PartnerApplicationActions({ application }: { application: AdminPartnerApplicationDto }) {
    const t = useTranslations('AdminPage.partnerApplications');
    const approve = usePartnerApplicationApprove(application.id);
    const decline = usePartnerApplicationDecline(application.id);

    return (
        <section className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
            {/* Approve */}
            <button
                type="button"
                onClick={approve.open}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
                <Check className="h-4 w-4" aria-hidden="true" />
                {t('approve')}
            </button>

            {/* Decline */}
            <button
                type="button"
                onClick={decline.open}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-muted ring-1 ring-border hover:text-ink"
            >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('decline')}
            </button>

            {/* Dialogs */}
            <ApprovePartnerApplicationModal businessName={application.businessName} approve={approve} />
            <DeclinePartnerApplicationModal applicationId={application.id} businessName={application.businessName} decline={decline} />
        </section>
    );
}
