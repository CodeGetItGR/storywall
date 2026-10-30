'use client';

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
                        {approve.foundingDisabled
                            ? t('partnerApplications.foundingNone')
                            : t('partnerApplications.foundingLabel', { left: approve.spotsLeft ?? 0, total: approve.spotsTotal ?? 0 })}
                    </label>

                    {/* Error */}
                    {approve.errorMessageKey && (
                        <p className="text-sm text-status-danger">
                            {t(`errors.${approve.errorMessageKey}`)}{' '}
                            {approve.existingPartnerHash && (
                                <a href={approve.existingPartnerHash} className="font-semibold underline">
                                    {t('partnerApplications.openExistingPartner')}
                                </a>
                            )}
                        </p>
                    )}
                </div>
            }
            cancelLabel={t('partnerApplications.cancel')}
            confirmLabel={t('partnerApplications.approve')}
            isConfirming={approve.isPending}
            onConfirmAction={approve.confirm}
            tone="default"
            size="md"
        />
    );
}
