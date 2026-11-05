'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { DiscountCampaignLinks } from '@/components/admin/discountCampaigns/DiscountCampaignLinks';
import { SiteNoticeStatusPill } from '@/components/admin/siteNotices/SiteNoticePills';
import { BackButton } from '@/components/ui/BackButton';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useDiscountCampaignForm } from '@/hooks/useDiscountCampaignForm';
import { DISCOUNT_CAMPAIGNS_HASH_ROOT } from '@/lib/adminRecordRouting';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import { DISCOUNT_CAMPAIGN_LABEL_MAX, DISCOUNT_CAMPAIGN_LINK_NAME_MAX, DISCOUNT_CAMPAIGN_NAME_MAX } from '@/lib/discountCampaignForm';

// Create or edit one discount campaign. The panel remounts it (key) for each campaign.
export function DiscountCampaignPage({
    campaign,
    onBackAction,
    onDoneAction,
}: {
    campaign: AdminDiscountCampaignDto | null;
    onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void;
    onDoneAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const f = useDiscountCampaignForm(campaign, onDoneAction);
    const { form } = f;

    return (
        <div className="space-y-6">
            {/* Back */}
            <BackButton href={DISCOUNT_CAMPAIGNS_HASH_ROOT} label={t('discountCampaigns.back')} onClick={onBackAction} />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight break-words text-ink sm:text-3xl">
                    {campaign ? campaign.name : t('discountCampaigns.createTitle')}
                </h2>
                {campaign && <SiteNoticeStatusPill status={campaign.status} />}
            </div>

            <div
                className={
                    campaign ? 'grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] lg:items-start' : 'max-w-2xl'
                }
            >
                <form onSubmit={f.handleSubmit}>
                    <fieldset disabled={f.readOnly} className="space-y-5">
                        {/* Details */}
                        <AdminField label={t('discountCampaigns.fields.name')} required>
                            <input
                                name="name"
                                aria-label={t('discountCampaigns.fields.name')}
                                required
                                maxLength={DISCOUNT_CAMPAIGN_NAME_MAX}
                                className={adminInputClass()}
                                value={form.name}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.percent')} required>
                            <input
                                name="percent"
                                type="number"
                                aria-label={t('discountCampaigns.fields.percent')}
                                required
                                min="0.01"
                                max="99.99"
                                step="0.01"
                                className={adminInputClass('font-mono')}
                                value={form.percent}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.label')} optional>
                            <input
                                name="label"
                                aria-label={t('discountCampaigns.fields.label')}
                                maxLength={DISCOUNT_CAMPAIGN_LABEL_MAX}
                                className={adminInputClass()}
                                value={form.label}
                                onChange={f.handleTextChange}
                            />
                        </AdminField>
                        <AdminField label={t('discountCampaigns.fields.linkName')} required>
                            <input
                                name="linkName"
                                aria-label={t('discountCampaigns.fields.linkName')}
                                required
                                disabled={f.linkNameLocked}
                                maxLength={DISCOUNT_CAMPAIGN_LINK_NAME_MAX}
                                className={adminInputClass('font-mono')}
                                value={form.linkName}
                                onChange={f.handleLinkNameChange}
                            />
                        </AdminField>

                        {/* Schedule */}
                        <div className="grid gap-4">
                            <AdminField label={t('discountCampaigns.fields.startsAt')} optional>
                                <DateTimeField
                                    value={form.startsAt}
                                    onChange={f.setStartsAt}
                                    requireBoth
                                    disabled={f.startLocked}
                                    inputClassName={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('discountCampaigns.fields.endsAt')} required>
                                <DateTimeField value={form.endsAt} onChange={f.setEndsAt} required inputClassName={adminInputClass()} />
                            </AdminField>
                        </div>
                    </fieldset>

                    {/* Errors */}
                    {f.error !== null && (
                        <p role="alert" className="mt-5 text-sm text-status-danger">
                            {f.errorDetail ?? t(`errors.${adminErrorMessageKey(f.error)}`)}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between gap-2">
                        <div>
                            {f.canStop && (
                                <button
                                    type="button"
                                    onClick={f.openStopConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('discountCampaigns.stop')}
                                </button>
                            )}
                            {f.canDelete && (
                                <button
                                    type="button"
                                    onClick={f.openDeleteConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('discountCampaigns.delete')}
                                </button>
                            )}
                        </div>
                        {!f.readOnly && (
                            <button
                                type="submit"
                                disabled={f.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {f.busy && !f.confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        )}
                    </div>
                </form>

                {/* Links */}
                {campaign && <DiscountCampaignLinks campaign={campaign} />}
            </div>

            <ConfirmActionModal
                open={f.confirmation !== null}
                title={f.confirmation === 'delete' ? t('discountCampaigns.deleteTitle') : t('discountCampaigns.stopTitle')}
                body={f.confirmation === 'delete' ? t('discountCampaigns.deleteBody') : t('discountCampaigns.stopBody')}
                confirmLabel={f.confirmation === 'delete' ? t('discountCampaigns.delete') : t('discountCampaigns.stopConfirm')}
                cancelLabel={f.confirmation === 'delete' ? t('cancel') : t('discountCampaigns.stopCancel')}
                tone="danger"
                isConfirming={f.confirming}
                onCloseAction={f.closeConfirmation}
                onConfirmAction={f.confirmAction}
                icon={f.confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </div>
    );
}
