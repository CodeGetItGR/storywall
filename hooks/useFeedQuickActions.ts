'use client';

import { useTranslations } from 'next-intl';

import { useInviteShare } from '@/hooks/useInviteShare';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useEventVendors } from '@/hooks/useVendors';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { type FeedQuickActionKey, feedQuickActionKeys } from '@/lib/feedQuickActions';
import { invitationPublicUrl } from '@/lib/invitation/publication';
import { routes } from '@/lib/routes';
import { SITE_URL } from '@/lib/seo';
import { listedVendors } from '@/lib/vendors';

export interface FeedQuickAction {
    key: FeedQuickActionKey;
    label: string;
    // A link, or a button (Share) when null.
    href: string | null;
    onClick?: () => void;
    // Share copied the link instead of opening the share sheet.
    done?: boolean;
}

// The quick actions under the feed's composer, in order: the online invitation, photo upload, the wishbook,
// the host's Share and the event's vendors. Each shows only when the event has it.
export function useFeedQuickActions(event: EventDetailResponseDto): FeedQuickAction[] {
    const t = useTranslations('FeedQuickActions');
    const wishbookName = useModuleCopy(event.eventType)('wishbook').name;
    const readable = readableModuleKeys(event);
    const vendors = useEventVendors(readable.has('vendors') ? event.id : null);
    // Host only: unavailable for everyone else.
    const inviteShare = useInviteShare();

    const invitationSlug = event.invitationSlug ?? null;
    const uploadToken = event.uploadToken ?? null;
    const keys = feedQuickActionKeys({
        invitationSlug,
        uploadToken,
        hasWishbook: readable.has('wishbook'),
        canShare: inviteShare.available,
        hasVendors: listedVendors(vendors.data ?? []).length > 0,
    });

    return keys.map((key): FeedQuickAction => {
        if (key === 'invitation' && invitationSlug) return { key, label: t('invitation'), href: invitationPublicUrl(SITE_URL, invitationSlug) };
        if (key === 'photos' && uploadToken) return { key, label: t('photos'), href: routes.qrCode(uploadToken, { choice: 'upload' }) };
        if (key === 'wishbook') return { key, label: wishbookName, href: routes.events.tools.wishbook(event.id) };
        if (key === 'share') {
            return {
                key,
                label: inviteShare.copied ? t('shareCopied') : t('share'),
                href: null,
                onClick: inviteShare.share,
                done: inviteShare.copied,
            };
        }
        return { key, label: t('vendors'), href: routes.events.tools.vendors(event.id) };
    });
}
