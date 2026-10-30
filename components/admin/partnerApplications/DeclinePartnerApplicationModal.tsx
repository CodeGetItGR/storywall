'use client';

import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DECLINE_REASON_MAX, type usePartnerApplicationDecline } from '@/hooks/usePartnerApplicationDecline';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function DeclinePartnerApplicationModal({
    applicationId,
    businessName,
    decline,
}: {
    applicationId: string;
    businessName: string;
    decline: ReturnType<typeof usePartnerApplicationDecline>;
}) {
    const t = useTranslations('AdminPage');
    const reasonId = `decline-reason-${applicationId}`;

    return (
        <ConfirmActionModal
            open={decline.isOpen}
            onCloseAction={decline.close}
            title={t('partnerApplications.declineTitle', { name: businessName })}
            body={
                <div className="space-y-1.5">
                    {/* Reason */}
                    <label htmlFor={reasonId} className="text-xs font-semibold text-ink">
                        {t('partnerApplications.reasonLabel')}
                    </label>
                    <textarea
                        id={reasonId}
                        value={decline.reason}
                        onChange={decline.handleReasonChange}
                        rows={4}
                        maxLength={DECLINE_REASON_MAX}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink"
                    />
                    <p className="text-xs text-ink-muted">{t('partnerApplications.reasonHelp')}</p>

                    {/* Error */}
                    {decline.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(decline.error)}`)}</p>}
                </div>
            }
            cancelLabel={t('partnerApplications.cancel')}
            confirmLabel={t('partnerApplications.decline')}
            isConfirming={decline.isPending}
            onConfirmAction={decline.confirm}
            tone="danger"
            size="md"
        />
    );
}
