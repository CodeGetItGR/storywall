'use client';

import { useLocale, useTranslations } from 'next-intl';

import { usePartnerApplication } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { applicationLinkHref } from '@/lib/adminPartnerApplications';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';

export function usePartnerApplicationDetail(applicationId: string) {
    const t = useTranslations('AdminPage.partnerApplications');
    const locale = useLocale();
    const query = usePartnerApplication(applicationId);
    const application = query.data ?? null;

    let decision: string | null = null;
    if (application && application.status !== 'PENDING' && application.decidedAt) {
        const status = t(`status.${application.status}`);
        const date = formatAdminDateTime(locale, application.decidedAt);
        decision = application.decidedByEmail
            ? t('decidedBy', { status, email: application.decidedByEmail, date })
            : t('decidedByUnknown', { status, date });
    }

    return {
        application,
        isLoading: query.isLoading,
        error: query.error,
        receivedAt: application ? formatAdminDateTime(locale, application.createdAt) : '',
        linkHref: application ? applicationLinkHref(application.link) : null,
        source: application ? [application.utmSource, application.utmMedium, application.utmCampaign].filter(Boolean).join(' / ') || null : null,
        decision,
        partnerHash: application?.collaboratorId ? formatCollaborationsHash(application.collaboratorId) : null,
    };
}
