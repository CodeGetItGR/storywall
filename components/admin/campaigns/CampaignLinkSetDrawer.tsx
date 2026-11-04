'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useCampaignLinkSetForm } from '@/hooks/useCampaignLinkSetForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignLinkLanguage } from '@/lib/api/types';
import { DISCOUNT_CAMPAIGN_LINK_NAME_MAX, DISCOUNT_CAMPAIGN_NAME_MAX } from '@/lib/discountCampaignForm';

const FORM_ID = 'campaign-link-set-form';

// The 8 common links for a language. The panel remounts it (key) on every opening.
export function CampaignLinkSetDrawer({
    open,
    language,
    onCloseAction,
}: {
    open: boolean;
    language: CampaignLinkLanguage;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const f = useCampaignLinkSetForm(language, onCloseAction);

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            closeDisabled={f.busy}
            title={language === 'en' ? t('campaigns.linkSet.english') : t('campaigns.linkSet.greek')}
            footer={
                <>
                    <div />
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={f.busy}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            disabled={f.busy}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {f.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('campaigns.linkSet.create')}
                        </button>
                    </div>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                {/* Details */}
                <AdminField label={t('campaigns.linkSet.name')} required>
                    <input
                        aria-label={t('campaigns.linkSet.name')}
                        required
                        maxLength={DISCOUNT_CAMPAIGN_NAME_MAX}
                        className={adminInputClass()}
                        value={f.name}
                        onChange={f.handleNameChange}
                    />
                </AdminField>
                <AdminField label={t('campaigns.linkSet.linkName')} required>
                    <input
                        aria-label={t('campaigns.linkSet.linkName')}
                        required
                        maxLength={DISCOUNT_CAMPAIGN_LINK_NAME_MAX}
                        className={adminInputClass('font-mono')}
                        value={f.linkName}
                        onChange={f.handleLinkNameChange}
                    />
                </AdminField>

                {/* Errors */}
                {f.error !== null && (
                    <p role="alert" className="text-sm text-status-danger">
                        {t(`errors.${adminErrorMessageKey(f.error)}`)}
                    </p>
                )}
            </form>
        </AdminDrawer>
    );
}
