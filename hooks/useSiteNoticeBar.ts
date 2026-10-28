'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useApiDown } from '@/hooks/useApiHealth';
import { useSiteNoticeDismissals } from '@/hooks/useSiteNoticeDismissals';
import { useSiteNotices } from '@/hooks/useSiteNotices';
import type { SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { dismissalKey, pickSiteNotice, type SiteNoticeViewArea } from '@/lib/siteNotices';

export type SiteNoticeView = {
    tone: SiteNoticeTone;
    message: string;
    link: { href: string; label: string } | null;
    onDismiss: (() => void) | null;
};

const NO_NOTICES: SiteNoticeLiveDto[] = [];

// What the bar shows, if anything: the built-in outage notice while Spring is unreachable,
// otherwise the best matching notice that hasn't been closed.
export function useSiteNoticeBar(area: SiteNoticeViewArea | null, initialDismissed: string): SiteNoticeView | null {
    const t = useTranslations('SiteNotice');
    const locale = useLocale();
    const notices = useSiteNotices().data ?? NO_NOTICES;
    const apiDown = useApiDown();
    const { dismissed, dismiss } = useSiteNoticeDismissals(initialDismissed);
    const notice = useMemo(() => pickSiteNotice(notices, area, dismissed), [notices, area, dismissed]);
    const key = notice ? dismissalKey(notice) : null;
    const handleDismiss = useCallback(() => {
        if (key) dismiss(key);
    }, [dismiss, key]);

    if (area === null) return null;
    if (apiDown) return { tone: 'CRITICAL', message: t('apiDown'), link: null, onDismiss: null };
    if (!notice) return null;
    return {
        tone: notice.tone,
        message: resolveLocalizedText(notice.message, locale),
        link: notice.linkUrl ? { href: notice.linkUrl, label: resolveLocalizedText(notice.linkLabel, locale) } : null,
        onDismiss: notice.dismissible ? handleDismiss : null,
    };
}
