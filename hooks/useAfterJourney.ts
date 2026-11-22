'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useExtensionOptions } from '@/hooks/useBilling';
import { useGallerySummary } from '@/hooks/useGalleryArchive';
import { useHostAnnouncementLink } from '@/hooks/useHostAnnouncementLink';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useWishbookCount } from '@/hooks/useWishbook';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { canExtendCoverage } from '@/lib/billing';
import { formatDate } from '@/lib/datetime';
import { type JourneyStopModel, journeyTimeZone, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

/**
 * The After journey: later sessions, then media, wishbook, the thank-you and the plan's coverage.
 * The plan links to Extend only when the main host can buy at least one extension, as the Billing
 * page's Extend coverage section (useCoverageExtensionSection) offers it.
 */
export function useAfterJourney(event: EventDetailResponseDto, planName: string | null, now: Date = new Date()) {
    const t = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const readable = readableModuleKeys(event);
    const announcement = useHostAnnouncementLink(event);
    const gallery = useGallerySummary(event.id, readable.has('gallery'));
    const wishbook = useWishbookCount(readable.has('wishbook') ? event.id : null);
    const timeZone = journeyTimeZone(event);

    const later = sessionsByPhase(event).after;
    const states = sessionStates(later, timeZone, now);
    const sessionStops: JourneyStopModel[] = later.map((item, index) => ({
        key: `session-${item.id}`,
        title: item.title,
        icon: 'session',
        status: states[index] === 'done' ? 'done' : 'upcoming',
        href: routes.events.tools.schedule(event.id),
        detail: item.startAt
            ? formatDate(locale, item.startAt, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone,
              })
            : undefined,
    }));

    const galleryHref = routes.events.tools.gallery(event.id);
    const billingHref = routes.events.manage(event.id, { tab: 'billing' });
    const coverageEndsAt = event.schedule.coverageEndsAt;
    const canExtend = canExtendCoverage({ isPrimaryHost: useIsPrimaryHost(), eventStatus: event.status, coverageEndsAt, now });
    const extensionOptions = useExtensionOptions(event.id, canExtend);
    const sellsExtension = canExtend && (extensionOptions.data?.length ?? 0) > 0;

    const extras: (JourneyStopModel | false | null | undefined | '')[] = [
        readable.has('gallery') && {
            key: 'media',
            title: tr('mediaSummary.title'),
            icon: 'media',
            status: 'current',
            href: galleryHref,
            detail: t('journey.media', { photos: gallery.data?.photoCount ?? 0, videos: gallery.data?.videoCount ?? 0 }),
            card: { action: { label: t('coverage.download'), href: galleryHref } },
        },
        readable.has('wishbook') && {
            key: 'wishbook',
            title: moduleCopy('wishbook').name,
            icon: 'wishbook',
            status: 'upcoming',
            href: routes.events.tools.wishbook(event.id),
            detail: tr('wishbookSummary.count', { count: wishbook.data ?? 0 }),
        },
        announcement && {
            key: 'announcement',
            title: announcement.label,
            icon: 'announcement',
            status: 'upcoming',
            href: announcement.href,
            detail: t('journey.thankGuests'),
        },
        planName &&
            coverageEndsAt && {
                key: 'plan',
                title: planName,
                icon: 'plan',
                status: 'upcoming',
                href: billingHref,
                detail: t('journey.coverageEnds', { date: formatDate(locale, coverageEndsAt, { day: 'numeric', month: 'short', timeZone }) }),
                links: sellsExtension ? [{ key: 'extend', label: t('journey.extend'), href: billingHref }] : undefined,
            },
    ];

    return { stops: [...sessionStops, ...extras.filter((stop): stop is JourneyStopModel => Boolean(stop))] };
}
