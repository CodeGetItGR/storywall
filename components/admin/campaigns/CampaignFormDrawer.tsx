'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import {
    CAMPAIGN_CANCEL_BUTTON,
    CAMPAIGN_DANGER_BUTTON,
    CAMPAIGN_QUIET_BUTTON,
    CAMPAIGN_SAVE_BUTTON,
} from '@/components/admin/campaigns/campaignButtons';
import { CampaignLinkPicker } from '@/components/admin/campaigns/CampaignLinkPicker';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { type CampaignConfirmation, useCampaignForm } from '@/hooks/useCampaignForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CampaignDto, CampaignLinkDto } from '@/lib/api/types';
import { CAMPAIGN_FORM_NAME_MAX, CAMPAIGN_LABEL_MAX, CAMPAIGN_LINK_NAME_MAX } from '@/lib/campaignForm';

const FORM_ID = 'campaign-form';

// Each confirmation's words. Archive and unarchive are easy to undo, so they aren't shown as danger.
const CONFIRMATION_COPY = {
    stop: { title: 'stopDiscount.title', body: 'stopDiscount.body', confirm: 'stopDiscount.button', cancel: 'stopDiscount.cancel', tone: 'danger' },
    archive: { title: 'archive.title', body: 'archive.body', confirm: 'archive.button', cancel: null, tone: 'default' },
    unarchive: { title: 'unarchive.title', body: 'unarchive.body', confirm: 'unarchive.button', cancel: null, tone: 'default' },
    delete: { title: 'deleteCampaign.title', body: 'deleteCampaign.body', confirm: 'deleteCampaign.button', cancel: null, tone: 'danger' },
} as const satisfies Record<CampaignConfirmation, unknown>;

// Creates a campaign with its first links, or edits a saved one: details, dates and discount, with
// stop, archive, unarchive and delete in the footer. Remounted (key) on every opening.
export function CampaignFormDrawer({
    open,
    campaign,
    links,
    deletable,
    canEditDiscount,
    onCloseAction,
    onCreatedAction,
    onDeletedAction,
}: {
    open: boolean;
    campaign: CampaignDto | null;
    links: readonly CampaignLinkDto[];
    deletable: boolean;
    canEditDiscount: boolean;
    onCloseAction: () => void;
    onCreatedAction: (id: string) => void;
    onDeletedAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const f = useCampaignForm({
        campaign,
        links,
        deletable,
        canEditDiscount,
        onDone: onCloseAction,
        onCreated: onCreatedAction,
        onDeleted: onDeletedAction,
    });
    const { form } = f;
    const copy = CONFIRMATION_COPY[f.confirmation];

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={f.busy}
                title={campaign ? t('campaigns.form.editTitle') : t('campaigns.newCampaign')}
                footer={
                    <>
                        {/* Record actions */}
                        <div className="flex flex-wrap items-center gap-1">
                            {f.canStop && (
                                <button
                                    type="button"
                                    value="stop"
                                    onClick={f.handleConfirmationClick}
                                    disabled={f.busy}
                                    className={CAMPAIGN_DANGER_BUTTON}
                                >
                                    {t('campaigns.stopDiscount.button')}
                                </button>
                            )}
                            {f.canArchive && (
                                <button
                                    type="button"
                                    value="archive"
                                    onClick={f.handleConfirmationClick}
                                    disabled={f.busy}
                                    className={CAMPAIGN_QUIET_BUTTON}
                                >
                                    {t('campaigns.archive.button')}
                                </button>
                            )}
                            {f.canUnarchive && (
                                <button
                                    type="button"
                                    value="unarchive"
                                    onClick={f.handleConfirmationClick}
                                    disabled={f.busy}
                                    className={CAMPAIGN_QUIET_BUTTON}
                                >
                                    {t('campaigns.unarchive.button')}
                                </button>
                            )}
                            {f.canDelete && (
                                <button
                                    type="button"
                                    value="delete"
                                    onClick={f.handleConfirmationClick}
                                    disabled={f.busy}
                                    className={CAMPAIGN_DANGER_BUTTON}
                                >
                                    {t('campaigns.deleteCampaign.button')}
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onCloseAction} disabled={f.busy} className={CAMPAIGN_CANCEL_BUTTON}>
                                {t('cancel')}
                            </button>
                            <button type="submit" form={FORM_ID} disabled={f.busy} className={CAMPAIGN_SAVE_BUTTON}>
                                {f.busy && !f.confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Details */}
                    <AdminField label={t('campaigns.fields.name')} required>
                        <input
                            name="name"
                            aria-label={t('campaigns.fields.name')}
                            required
                            maxLength={CAMPAIGN_FORM_NAME_MAX}
                            className={adminInputClass()}
                            value={form.name}
                            onChange={f.handleNameChange}
                        />
                    </AdminField>
                    <AdminField label={t('campaigns.fields.linkName')} required hint={t('campaigns.fields.campaignHint')}>
                        <input
                            name="linkName"
                            aria-label={t('campaigns.fields.linkName')}
                            required
                            pattern="[a-z0-9][a-z0-9._\-]*"
                            disabled={f.linkNameLocked}
                            maxLength={CAMPAIGN_LINK_NAME_MAX}
                            className={adminInputClass('font-mono')}
                            value={form.linkName}
                            onChange={f.handleLinkNameChange}
                        />
                    </AdminField>

                    {/* Dates */}
                    <div className="grid gap-4">
                        <AdminField label={t('campaigns.fields.startsAt')} optional>
                            <DateTimeField
                                value={form.startsAt}
                                onChange={f.setStartsAt}
                                requireBoth
                                disabled={f.startLocked}
                                inputClassName={adminInputClass()}
                            />
                        </AdminField>
                        <AdminField label={t('campaigns.fields.endsAt')} required={form.discountOn} optional={!form.discountOn}>
                            <DateTimeField
                                value={form.endsAt}
                                onChange={f.setEndsAt}
                                required={form.discountOn}
                                requireBoth
                                disabled={f.datesLocked}
                                inputClassName={adminInputClass()}
                            />
                        </AdminField>
                    </div>

                    {/* Discount */}
                    <div className="overflow-hidden rounded-lg border border-border bg-canvas">
                        <AdminSwitch
                            label={t('campaigns.form.discount')}
                            checked={form.discountOn}
                            disabled={f.toggleLocked}
                            onCheckedChangeAction={f.setDiscountOn}
                        />
                        {form.discountOn && (
                            <fieldset disabled={f.discountLocked} className="grid gap-4 p-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                                <AdminField label={t('campaigns.fields.percent')} required>
                                    <input
                                        name="percent"
                                        type="number"
                                        aria-label={t('campaigns.fields.percent')}
                                        required
                                        min="0.01"
                                        max="99.99"
                                        step="0.01"
                                        className={adminInputClass('font-mono')}
                                        value={form.percent}
                                        onChange={f.handleTextChange}
                                    />
                                </AdminField>
                                <AdminField label={t('campaigns.fields.label')} optional>
                                    <input
                                        name="label"
                                        aria-label={t('campaigns.fields.label')}
                                        maxLength={CAMPAIGN_LABEL_MAX}
                                        className={adminInputClass()}
                                        value={form.label}
                                        onChange={f.handleTextChange}
                                    />
                                </AdminField>
                            </fieldset>
                        )}
                    </div>

                    {/* Links: with a new campaign only; a saved one adds them from Links */}
                    {!campaign && <CampaignLinkPicker picker={f.picker} />}

                    {/* Errors */}
                    {f.error !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {f.errorDetail ?? t(`errors.${adminErrorMessageKey(f.error)}`)}
                        </p>
                    )}
                </form>
            </AdminDrawer>

            {/* Confirmation */}
            <ConfirmActionModal
                open={f.confirmOpen}
                title={t(`campaigns.${copy.title}`)}
                body={t(`campaigns.${copy.body}`)}
                confirmLabel={t(`campaigns.${copy.confirm}`)}
                cancelLabel={copy.cancel ? t(`campaigns.${copy.cancel}`) : t('cancel')}
                tone={copy.tone}
                isConfirming={f.confirming}
                onCloseAction={f.closeConfirmation}
                onConfirmAction={f.confirmAction}
                icon={f.confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
