'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { usePartnerApplicationApprove } from '@/hooks/usePartnerApplicationApprove';

export function ApprovePartnerApplicationModal({
    businessName,
    approve,
}: {
    businessName: string;
    approve: ReturnType<typeof usePartnerApplicationApprove>;
}) {
    const t = useTranslations('AdminPage');

    return (
        <ConfirmActionModal
            open={approve.isOpen}
            onCloseAction={approve.close}
            title={t('partnerApplications.approveTitle', { name: businessName })}
            body={
                <div className="space-y-4">
                    {/* Body */}
                    <p>{t('partnerApplications.approveBody')}</p>

                    {/* Founding */}
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                        <input
                            type="checkbox"
                            checked={approve.founding}
                            disabled={approve.foundingDisabled}
                            onChange={approve.handleFoundingChange}
                            className="h-4 w-4 accent-primary"
                        />
                        {approve.foundingLabel === 'unknown' && t('partnerApplications.foundingPlain')}
                        {approve.foundingLabel === 'none' && t('partnerApplications.foundingNone')}
                        {approve.foundingLabel === 'available' &&
                            t('partnerApplications.foundingLabel', { left: approve.spotsLeft ?? 0, total: approve.spotsTotal ?? 0 })}
                    </label>
                    {approve.summaryFailed && <p className="text-sm text-status-danger">{t('partnerApplications.foundingError')}</p>}

                    {/* Error */}
                    {approve.errorMessageKey && (
                        <p className="text-sm text-status-danger">
                            {t(`errors.${approve.errorMessageKey}`)}{' '}
                            {approve.existingPartnerHash && (
                                <button type="button" onClick={approve.openExistingPartner} className="font-semibold underline">
                                    {t('partnerApplications.openExistingPartner')}
                                </button>
                            )}
                        </p>
                    )}
                </div>
            }
            cancelLabel={t('partnerApplications.cancel')}
            confirmLabel={t('partnerApplications.approve')}
            isConfirming={approve.isPending}
            confirmDisabled={approve.summaryLoading}
            iconTone="neutral"
            icon={<Check className="h-5 w-5" aria-hidden="true" />}
            onConfirmAction={approve.confirm}
            tone="default"
            size="md"
        />
    );
}
