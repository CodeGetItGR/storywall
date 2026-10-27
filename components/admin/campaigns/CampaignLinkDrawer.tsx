'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CampaignLinkShare } from '@/components/admin/campaigns/CampaignLinkShare';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCampaignLinkDetail } from '@/hooks/useCampaignLinkDetail';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignLinkDto } from '@/lib/api/types';
import { CAMPAIGN_NAME_MAX } from '@/lib/campaignLinks';

const FORM_ID = 'campaign-link-detail-form';

// One saved link. Only the name can change. The panel remounts it (key) on every opening.
export function CampaignLinkDrawer({ open, link, onCloseAction }: { open: boolean; link: CampaignLinkDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = useCampaignLinkDetail(link, onCloseAction);

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={f.busy}
                title={link.name}
                footer={
                    <>
                        {/* Danger */}
                        <button
                            type="button"
                            onClick={f.openDeleteConfirmation}
                            disabled={f.busy}
                            className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                        >
                            {t('campaigns.delete')}
                        </button>

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
                                {f.busy && !f.deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Name */}
                    <AdminField label={t('campaigns.fields.name')} required hint={`${f.name.length}/${CAMPAIGN_NAME_MAX}`}>
                        <input
                            name="name"
                            aria-label={t('campaigns.fields.name')}
                            className={adminInputClass()}
                            maxLength={CAMPAIGN_NAME_MAX}
                            value={f.name}
                            onChange={f.handleNameChange}
                        />
                    </AdminField>

                    {/* Values */}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-ink-muted">{t('campaigns.fields.page')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.destinationPath}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.source')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmSource}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.medium')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmMedium}</dd>
                        <dt className="text-ink-muted">{t('campaigns.fields.campaign')}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink">{link.utmCampaign}</dd>
                    </dl>

                    {/* Link */}
                    <CampaignLinkShare url={f.url} fileName={link.utmCampaign} />

                    {/* Errors */}
                    {f.nameProblem && <p className="text-sm text-status-danger">{t('campaigns.problems.name')}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={f.confirmDelete}
                title={t('campaigns.deleteTitle')}
                body={t('campaigns.deleteBody')}
                confirmLabel={t('campaigns.deleteConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={f.deleting}
                onCloseAction={f.closeDeleteConfirmation}
                onConfirmAction={f.confirmDeletion}
                icon={f.deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
