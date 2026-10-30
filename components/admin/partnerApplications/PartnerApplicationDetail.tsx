'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PartnerApplicationActions } from '@/components/admin/partnerApplications/PartnerApplicationActions';
import { PartnerApplicationDecision } from '@/components/admin/partnerApplications/PartnerApplicationDecision';
import { PartnerApplicationDetails } from '@/components/admin/partnerApplications/PartnerApplicationDetails';
import { PartnerApplicationStatusPill } from '@/components/admin/partnerApplications/PartnerApplicationStatusPill';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePartnerApplicationDetail } from '@/hooks/usePartnerApplicationDetail';
import { PARTNER_APPLICATIONS_HASH_ROOT } from '@/lib/adminPartnerApplicationsRouting';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PartnerApplicationDetail({
    applicationId,
    onBackAction,
}: {
    applicationId: string;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
    const t = useTranslations('AdminPage');
    const detail = usePartnerApplicationDetail(applicationId);
    const { application } = detail;

    return (
        <div className="max-w-4xl space-y-8">
            {/* Back */}
            <BackButton href={PARTNER_APPLICATIONS_HASH_ROOT} label={t('partnerApplications.back')} onClick={onBackAction} />

            {detail.isLoading && <LoadingState label={t('partnerApplications.loading')} className="justify-start py-6" />}
            {Boolean(detail.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(detail.error)}`)}</p>}

            {application && detail.linkHref && (
                <>
                    {/* Header */}
                    <header className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{application.businessName}</h2>
                            <PartnerApplicationStatusPill status={application.status} />
                        </div>
                        <p className="text-sm text-ink-muted">{t('partnerApplications.receivedAt', { date: detail.receivedAt })}</p>
                    </header>

                    {/* Details */}
                    <PartnerApplicationDetails application={application} linkHref={detail.linkHref} source={detail.source} />

                    {/* Decision */}
                    {detail.decision && (
                        <PartnerApplicationDecision application={application} decision={detail.decision} partnerHash={detail.partnerHash} />
                    )}

                    {/* Actions */}
                    {application.status === 'PENDING' && <PartnerApplicationActions application={application} />}
                </>
            )}
        </div>
    );
}
