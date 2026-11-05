'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useApiDown } from '@/hooks/useApiHealth';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { useSiteNotices } from '@/hooks/useSiteNotices';
import type { Locale } from '@/i18n/config';
import type { SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { campaignShowsOver, discountCampaignDismissalKey, plansHref } from '@/lib/discountCampaign';
import { numberFormat } from '@/lib/format';
import { resolveLocalizedText } from '@/lib/localizedText';
import { dismissalKey, pickSiteNotice, type SiteNoticeViewArea } from '@/lib/siteNotices';

export type SiteNoticeView = {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
    countdownEndsAt?: string;
};

const NO_NOTICES: SiteNoticeLiveDto[] = [];

// What the bar shows, if anything: the built-in outage notice while Spring is unreachable, otherwise
// the live discount campaign, otherwise the best matching notice that hasn't been closed. A warning
// or critical notice keeps the bar over the campaign.
export function useSiteNoticeBar(area: SiteNoticeViewArea | null, initialDismissed: string): SiteNoticeView | null {
    const t = useTranslations('SiteNotice');
    const locale = useLocale() as Locale;
    const notices = useSiteNotices().data ?? NO_NOTICES;
    const campaign = useLiveDiscountCampaign();
    const apiDown = useApiDown();
    const { dismissed, dismiss } = useSiteNoticeDismissals(initialDismissed);
    const notice = useMemo(() => pickSiteNotice(notices, area, dismissed), [notices, area, dismissed]);
    const key = notice ? dismissalKey(notice) : null;
    const campaignKey = campaign ? discountCampaignDismissalKey(campaign.id) : null;
    const handleDismiss = useCallback(() => {
        if (key) dismiss(key);
    }, [dismiss, key]);
    const handleCampaignDismiss = useCallback(() => {
        if (campaignKey) dismiss(campaignKey);
    }, [dismiss, campaignKey]);

    if (area === null) return null;
    if (apiDown) return { tone: 'CRITICAL', message: t('apiDown'), link: null, onDismiss: null };
    if (campaign && campaignShowsOver(campaign, notice, area, dismissed)) {
        return {
            tone: 'OFFER',
            message: t('campaign', { percent: numberFormat(locale).format(campaign.percent) }),
            link: { href: plansHref(locale), label: t('seePlans') },
            onDismiss: handleCampaignDismiss,
            countdownEndsAt: campaign.endsAt,
        };
    }
    if (!notice) return null;
    return {
        tone: notice.tone,
        message: resolveLocalizedText(notice.message, locale),
        link: notice.linkUrl ? { href: notice.linkUrl, label: resolveLocalizedText(notice.linkLabel, locale) } : null,
        onDismiss: notice.dismissible ? handleDismiss : null,
    };
}
