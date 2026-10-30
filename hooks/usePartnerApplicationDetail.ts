'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { usePartnerApplication } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { applicationLinkHref } from '@/lib/adminPartnerApplications';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';

export function usePartnerApplicationDetail(applicationId: string) {
    const t = useTranslations('AdminPage.partnerApplications');
    const locale = useLocale();
    const query = usePartnerApplication(applicationId);
    const application = query.data ?? null;
    const [alreadyDecided, setAlreadyDecided] = useState(false);
    const handleNotPending = useCallback(() => setAlreadyDecided(true), []);

    let decision: string | null = null;
    if (application && application.status !== 'PENDING' && application.decidedAt) {
        const date = formatAdminDateTime(locale, application.decidedAt);
        decision = application.decidedByEmail
            ? t('decidedBy', { email: application.decidedByEmail, date })
            : t('decidedByUnknown', { date });
    }

    return {
        application,
        alreadyDecided,
        handleNotPending,
        isLoading: query.isLoading,
        error: query.error,
        receivedAt: application ? formatAdminDateTime(locale, application.createdAt) : '',
        linkHref: application ? applicationLinkHref(application.link) : null,
        source: application ? [application.utmSource, application.utmMedium, application.utmCampaign].filter(Boolean).join(' / ') || null : null,
        decision,
        partnerHash: application?.collaboratorId ? formatCollaborationsHash(application.collaboratorId) : null,
    };
}
