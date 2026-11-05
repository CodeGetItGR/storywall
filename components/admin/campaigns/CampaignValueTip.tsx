'use client';

import { useTranslations } from 'next-intl';

import { AdminInfoTip } from '@/components/admin/AdminInfoTip';

export type CampaignValue =
    | 'visits'
    | 'visitors'
    | 'createClicks'
    | 'plansClicks'
    | 'planPicks'
    | 'signedUp'
    | 'createdEvent'
    | 'paidHost'
    | 'revenue'
    | 'sales'
    | 'salesRevenue';

// The "i" for one campaign value. `name` is the visible label it sits next to.
export function CampaignValueTip({ value, name }: { value: CampaignValue; name: string }) {
    const t = useTranslations('AdminPage.campaigns');

    return <AdminInfoTip label={t('valueHelpLabel', { name })} text={t(`valueHelp.${value}`)} />;
}

// A column or tile label with its "i" beside it.
export function CampaignValueLabel({ value, label }: { value: CampaignValue; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {label}
            <CampaignValueTip value={value} name={label} />
        </span>
    );
}
