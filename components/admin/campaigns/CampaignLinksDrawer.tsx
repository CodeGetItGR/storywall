'use client';

import { Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { CAMPAIGN_CANCEL_BUTTON, CAMPAIGN_PRIMARY_BUTTON, CAMPAIGN_SAVE_BUTTON } from '@/components/admin/campaigns/campaignButtons';
import { CampaignLinkDetail } from '@/components/admin/campaigns/CampaignLinkDetail';
import { CampaignLinkPicker } from '@/components/admin/campaigns/CampaignLinkPicker';
import { CampaignLinkRow } from '@/components/admin/campaigns/CampaignLinkRow';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCampaignLinks } from '@/hooks/useCampaignLinks';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignDto, CampaignLinkDto } from '@/lib/api/types';

const ADD_FORM_ID = 'campaign-links-form';

// A campaign's links: one row per link, a link opened in place, and the picker to add more. Remounted
// (key) on every opening.
export function CampaignLinksDrawer({
    open,
    campaign,
    links,
    others,
    onCloseAction,
}: {
    open: boolean;
    campaign: CampaignDto;
    links: readonly CampaignLinkDto[];
    others: readonly CampaignDto[];
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const l = useCampaignLinks(campaign, links, others);

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={l.busy}
                title={t('campaigns.linksDrawer.title')}
                footer={
                    l.mode === 'link' ? undefined : (
                        <>
                            <div />
                            {/* Actions */}
                            {l.mode === 'list' ? (
                                <button type="button" onClick={l.showAdd} className={CAMPAIGN_PRIMARY_BUTTON}>
                                    <Plus aria-hidden="true" className="h-4 w-4" />
                                    {t('campaigns.linksDrawer.add')}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={l.showList} disabled={l.busy} className={CAMPAIGN_CANCEL_BUTTON}>
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        form={ADD_FORM_ID}
                                        disabled={l.busy || l.picker.chosenCount === 0}
                                        className={CAMPAIGN_SAVE_BUTTON}
                                    >
                                        {l.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                        {t('campaigns.linksDrawer.add')}
                                    </button>
                                </div>
                            )}
                        </>
                    )
                }
            >
                {/* Links */}
                {l.mode === 'list' &&
                    (l.rows.length === 0 ? (
                        <p className="text-sm text-ink-muted">{t('campaigns.linksDrawer.empty')}</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {l.rows.map((row) => (
                                <CampaignLinkRow key={row.link.id} row={row} onOpenAction={l.handleRowClick} />
                            ))}
                        </ul>
                    ))}

                {/* Add links */}
                {l.mode === 'add' && (
                    <form id={ADD_FORM_ID} onSubmit={l.handleAddSubmit}>
                        <CampaignLinkPicker picker={l.picker} />
                    </form>
                )}

                {/* One link */}
                {l.mode === 'link' && l.selected && (
                    <CampaignLinkDetail
                        row={l.selected}
                        moveOptions={l.moveOptions}
                        moveTarget={l.moveTarget}
                        busy={l.busy}
                        onBackAction={l.showList}
                        onMoveTargetChangeAction={l.handleMoveTargetChange}
                        onMoveAction={l.handleMoveClick}
                        onDeleteAction={l.openDelete}
                    />
                )}

                {/* Errors */}
                {l.error !== null && (
                    <p role="alert" className="mt-5 text-sm text-status-danger">
                        {t(`errors.${adminErrorMessageKey(l.error)}`)}
                    </p>
                )}
            </AdminDrawer>

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={l.deleting}
                title={t('campaigns.deleteTitle')}
                body={t('campaigns.deleteBody')}
                confirmLabel={t('campaigns.deleteConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={l.removing}
                onCloseAction={l.closeDelete}
                onConfirmAction={l.deleteLink}
                icon={l.removing ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
