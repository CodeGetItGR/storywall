import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { eventInvitationKeys } from '@/hooks/useEventInvitations';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { eventThemeKeys } from '@/hooks/useEventTheme';
import { galleryArchiveKeys } from '@/hooks/useGalleryArchive';
import { giftKeys } from '@/hooks/useGift';
import { giftAccountKeys } from '@/hooks/useGiftAccount';
import { qrLinkKeys } from '@/hooks/useQrLinks';
import { rsvpKeys } from '@/hooks/useRsvps';
import { usageKeys } from '@/hooks/useUsage';
import { wishbookKeys } from '@/hooks/useWishbook';
import { getServerLocale } from '@/i18n/serverLocale';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type {
    EventDetailResponseDto,
    EventGiftAccountResponseDto,
    EventInvitationResponseDto,
    EventMemberResponseDto,
    EventUsageResponseDto,
    GiftHandoverResponseDto,
    MediaSummaryDto,
    QrLinkResponseDto,
    RsvpReportDto,
    RsvpResponseDto,
    ThemePresetDto,
} from '@/lib/api/types';
import { resolveServerEventContext, resolveServerEventDetail } from '@/lib/auth/serverEventContext';
import { isEventDeleted, isModuleAvailable, readableModuleKeys } from '@/lib/eventLifecycle';
import { canPickTheme } from '@/lib/eventTheme';
import { makeQueryClient } from '@/lib/queryClient';
import { routes } from '@/lib/routes';

import ManagePage from '../PageClient';

// The Overview's journey (OverviewJourney): the setup progress (useHelpProgress reads the gift
// account and the share links) and the totals (the gallery summary and the wishbook count).
// Each mirrors its hook's gate: the module readable on this event, none for the QR links.
// Each seeds on its own; a failure leaves it to the client. Resolves to the seeding step, so the
// reads can run alongside the others while the cache still fills in a fixed order.
async function prefetchJourney(event: EventDetailResponseDto, eventId: string, accessToken: string) {
    const readable = readableModuleKeys(event);
    const [giftAccount, qrLinks, mediaSummary, wishbookCount] = await Promise.all([
        readable.has('wishlist')
            ? serverGetOrNull<EventGiftAccountResponseDto>(endpoints.events.giftAccount(eventId), accessToken).catch(() => undefined)
            : undefined,
        serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken).catch(() => null),
        readable.has('gallery') ? serverGet<MediaSummaryDto>(endpoints.events.mediaSummary(eventId), accessToken).catch(() => null) : null,
        readable.has('wishbook') ? serverGet<number>(endpoints.events.wishbookCount(eventId), accessToken).catch(() => null) : null,
    ]);
    return (queryClient: ReturnType<typeof makeQueryClient>) => {
        if (giftAccount !== undefined) queryClient.setQueryData(giftAccountKeys.event(eventId), giftAccount);
        if (qrLinks) queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
        if (mediaSummary) queryClient.setQueryData(galleryArchiveKeys.summary(eventId), mediaSummary);
        if (wishbookCount !== null) queryClient.setQueryData(wishbookKeys.count(eventId), wishbookCount);
    };
}

type PageProps = { params: Promise<{ eventId: string }>; searchParams: Promise<{ tab?: string }> };

// ManageScreen fires five host-only calls in parallel on mount (members,
// rsvps, invitations, usage, the gift) — the biggest single client-side waterfall in
// the app. Mirrors ManageScreen's own gating (isHost, isDraft for everything
// but usage, and the plan including RSVP for rsvps) so a prefetch is never wasted on data the client
// wouldn't have requested anyway. A live event's Overview also prefetches its
// journey's reads (gift account, QR links, media summary, wishbook count; see
// prefetchJourney), alongside the rest.
// The RSVP page's STATISTICS report is prefetched when that page opens.
export default async function Page({ params, searchParams }: PageProps) {
    const { eventId } = await params;
    const { tab } = await searchParams;
    // The Invitation tab moved into Invitations & QR codes (KAN-225); old links land there.
    if (tab === 'invitation') redirect(routes.events.invitationsQr(eventId));
    // The RSVP page shows the STATISTICS report's numbers and attendance (KAN-227: no sub-tabs).
    const opensRsvp = tab === 'rsvp';
    const queryClient = makeQueryClient();
    // The event doesn't depend on the memberships, so both load at once.
    const [context, event] = await Promise.all([resolveServerEventContext(eventId), resolveServerEventDetail(eventId)]);

    // A deleted event's manage page shows only the banner and billing;
    // ManageScreen passes null ids for everything else, so don't prefetch it.
    if (context?.isHost && event && !isEventDeleted(event)) {
        const { accessToken } = context;
        const isDraft = event.status === 'DRAFT';
        const rsvpAvailable = isModuleAvailable(event.modules, 'rsvp');

        try {
            // Usage and the guest lists load together, and each seeds on its own:
            // a failed guest list must not discard usage, or the reverse.
            // The gift decides whether the "Given as a gift" section shows (null: not a gift).
            // The theme picker, only where ThemePicker would ask for it: a draft's overview
            // (every ?tab= resolves to it) or an active event's theme tab. An ended event
            // answers 5144; the catch leaves that to the client, which renders nothing.
            const wantsThemePresets = canPickTheme(event) && (isDraft || tab === 'theme');
            // The journey shows on a live event's Overview only (a draft's Overview is its plan panel).
            // It starts with the reads below, not after them, and seeds once they have.
            const opensOverview = !isDraft && (tab === undefined || tab === 'overview');
            const journey = opensOverview ? prefetchJourney(event, eventId, accessToken) : null;
            const [usage, gift, lists, themePresets] = await Promise.all([
                serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), accessToken).catch(() => null),
                isDraft ? undefined : serverGetOrNull<GiftHandoverResponseDto>(endpoints.events.gift(eventId), accessToken).catch(() => undefined),
                isDraft
                    ? null
                    : Promise.all([
                          serverGet<EventMemberResponseDto[]>(endpoints.events.members(eventId), accessToken),
                          rsvpAvailable ? serverGet<RsvpResponseDto[]>(endpoints.events.rsvps(eventId), accessToken) : null,
                          serverGet<EventInvitationResponseDto[]>(endpoints.events.invitations(eventId), accessToken),
                          rsvpAvailable && opensRsvp
                              ? // A failed report fetch alone must not discard the members/rsvps/invitations
                                // prefetches above in the same Promise.all — serverGet throws on !res.ok.
                                serverGet<RsvpReportDto>(endpoints.events.rsvpReport(eventId, 'STATISTICS'), accessToken).catch(() => null)
                              : null,
                      ]).catch(() => null),
                wantsThemePresets ? serverGet<ThemePresetDto[]>(endpoints.events.themePresets(eventId), accessToken).catch(() => null) : null,
            ]);

            if (usage) queryClient.setQueryData(usageKeys.event(eventId), usage);
            if (themePresets) queryClient.setQueryData(eventThemeKeys.presets(eventId), themePresets);
            if (gift !== undefined) queryClient.setQueryData(giftKeys.event(eventId), gift);
            if (lists) {
                const [members, rsvps, invitations, rsvpReport] = lists;
                queryClient.setQueryData(eventMemberKeys.list(eventId), normalizeList(members).items);
                if (rsvps) queryClient.setQueryData(rsvpKeys.list(eventId), normalizeList(rsvps).items);
                queryClient.setQueryData(eventInvitationKeys.list(eventId), normalizeList(invitations).items);
                if (rsvpReport) queryClient.setQueryData(rsvpKeys.report(eventId, 'STATISTICS', await getServerLocale()), rsvpReport);
            }
            if (journey) (await journey)(queryClient);
        } catch {
            // Best-effort — ManageScreen's own hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ManagePage />
        </HydrationBoundary>
    );
}
