'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { CampaignLinkShare } from '@/components/admin/campaigns/CampaignLinkShare';
import { useCampaignLinkForm } from '@/hooks/useCampaignLinkForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { CAMPAIGN_NAME_MAX, CAMPAIGN_PRESET_GROUPS, CAMPAIGN_PRESETS, CAMPAIGN_UTM_MAX } from '@/lib/campaignLinks';

const FORM_ID = 'campaign-link-form';

// The campaign link builder. The panel remounts it (key) on every opening.
export function CampaignLinkCreateDrawer({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = useCampaignLinkForm(onCloseAction);
    const { form } = f;

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            closeDisabled={f.busy}
            title={t('campaigns.createTitle')}
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
                            {t('campaigns.saveLink')}
                        </button>
                    </div>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                {/* Where */}
                <AdminField label={t('campaigns.fields.preset')}>
                    <select name="preset" value={form.preset} onChange={f.handlePresetChange} className={adminInputClass()}>
                        {CAMPAIGN_PRESET_GROUPS.map((group) => (
                            <optgroup key={group} label={t(`campaigns.presetGroups.${group}`)}>
                                {CAMPAIGN_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                                    <option key={preset.key} value={preset.key}>
                                        {t(`campaigns.presets.${preset.key}`)}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </AdminField>

                {/* Page */}
                <AdminField label={t('campaigns.fields.page')}>
                    <select name="destinationPath" value={form.destinationPath} onChange={f.handleDestinationChange} className={adminInputClass()}>
                        {f.destinations.map((destination) => (
                            <option key={destination.path} value={destination.path}>
                                {t(`campaigns.pages.${destination.kind}`)} · {destination.path}
                            </option>
                        ))}
                    </select>
                </AdminField>

                {/* Values */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label={t('campaigns.fields.source')} required>
                        <input
                            name="utmSource"
                            aria-label={t('campaigns.fields.source')}
                            className={adminInputClass('font-mono')}
                            maxLength={CAMPAIGN_UTM_MAX}
                            value={form.utmSource}
                            onChange={f.handleUtmChange}
                        />
                    </AdminField>
                    <AdminField label={t('campaigns.fields.medium')} required>
                        <input
                            name="utmMedium"
                            aria-label={t('campaigns.fields.medium')}
                            className={adminInputClass('font-mono')}
                            maxLength={CAMPAIGN_UTM_MAX}
                            value={form.utmMedium}
                            onChange={f.handleUtmChange}
                        />
                    </AdminField>
                </div>
                <AdminField label={t('campaigns.fields.campaign')} required hint={t('campaigns.fields.campaignHint')}>
                    <input
                        name="utmCampaign"
                        aria-label={t('campaigns.fields.campaign')}
                        className={adminInputClass('font-mono')}
                        maxLength={CAMPAIGN_UTM_MAX}
                        value={form.utmCampaign}
                        onChange={f.handleUtmChange}
                    />
                </AdminField>

                {/* Name */}
                <AdminField label={t('campaigns.fields.name')} required hint={`${form.name.length}/${CAMPAIGN_NAME_MAX}`}>
                    <input
                        name="name"
                        aria-label={t('campaigns.fields.name')}
                        className={adminInputClass()}
                        maxLength={CAMPAIGN_NAME_MAX}
                        value={form.name}
                        onChange={f.handleNameChange}
                    />
                </AdminField>

                {/* Link */}
                <CampaignLinkShare url={f.url} fileName={form.utmCampaign} />

                {/* Errors */}
                {f.problem && <p className="text-sm text-status-danger">{t(`campaigns.problems.${f.problem}`)}</p>}
                {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
