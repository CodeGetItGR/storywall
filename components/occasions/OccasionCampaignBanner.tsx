import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { OccasionCampaign } from '@/lib/occasions/campaigns';

export async function OccasionCampaignBanner({ campaign, locale }: { campaign: OccasionCampaign; locale: Locale }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.campaigns.${campaign.id}` });

    return (
        <p className="m-0 bg-[var(--occasion-accent)] px-5 py-2.5 text-center text-[13px] font-bold text-white">
            {t('banner')}
            {campaign.discountCode ? <span className="ml-2 rounded bg-white/20 px-2 py-0.5 font-mono">{campaign.discountCode}</span> : null}
        </p>
    );
}
