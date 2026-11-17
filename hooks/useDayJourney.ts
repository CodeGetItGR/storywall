'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useGallerySummary } from '@/hooks/useGalleryArchive';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useHostMenuItems } from '@/hooks/useToolsMenuItems';
import { useWishbookCount } from '@/hooks/useWishbook';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatTime } from '@/lib/datetime';
import { type JourneyStopModel, type JourneyStopStatus, sessionsByPhase, sessionStates } from '@/lib/eventJourney';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import type { JourneyIconKey } from '@/lib/journeyIcons';
import { routes } from '@/lib/routes';

export type QuickTool = { key: string; label: string; href: string; icon: JourneyIconKey };
export type JourneyTotal = { key: string; icon: JourneyIconKey; value: number; label: string };

const QUICK_TOOL_ICONS: Record<string, JourneyIconKey> = { invitationsQr: 'invitations', announcement: 'announcement' };

/** The On the day journey: the primary day's sessions, the quick tools and the totals. */
export function useDayJourney(event: EventDetailResponseDto, now: Date = new Date()) {
    const t = useTranslations('ManagePage');
    const tr = useTranslations('RightContextPanel');
    const locale = useLocale();
    const moduleCopy = useModuleCopy(event.eventType);
    const readable = readableModuleKeys(event);
    const hostItems = useHostMenuItems();
    const gallery = useGallerySummary(event.id, readable.has('gallery'));
    const wishbook = useWishbookCount(readable.has('wishbook') ? event.id : null);
    const timeZone = event.schedule.timezone;

    const daySessions = sessionsByPhase(event).day;
    const states = sessionStates(daySessions, timeZone, now);
    const stops: JourneyStopModel[] = daySessions.map((item, index) => {
        // A 24-hour clock, like the guests' schedule (ScheduleStorySession).
        const time = item.startAt ? formatTime(locale, item.startAt, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }) : undefined;
        const state = states[index];
        const status: JourneyStopStatus = state === 'now' ? 'current' : state;
        return {
            key: `session-${item.id}`,
            title: item.title,
            icon: 'session',
            status,
            href: routes.events.tools.schedule(event.id),
            detail: status === 'current' ? undefined : time,
            highlight: status === 'current' ? t('journey.now') : undefined,
            badge: status === 'current' ? time : undefined,
        };
    });

    const tools: QuickTool[] = [
        ...hostItems
            .filter((item) => item.key in QUICK_TOOL_ICONS)
            .map((item) => ({ key: item.key, label: item.label, href: item.href, icon: QUICK_TOOL_ICONS[item.key] })),
        ...(readable.has('playlist')
            ? [{ key: 'playlist', label: moduleCopy('playlist').name, href: routes.events.tools.playlist(event.id), icon: 'playlist' as const }]
            : []),
    ];

    const totals: JourneyTotal[] = [
        ...(readable.has('gallery') && gallery.data
            ? [{ key: 'media', icon: 'media' as const, value: gallery.data.photoCount + gallery.data.videoCount, label: tr('mediaSummary.title') }]
            : []),
        ...(readable.has('wishbook') && wishbook.data !== undefined
            ? [{ key: 'wishbook', icon: 'wishbook' as const, value: wishbook.data, label: moduleCopy('wishbook').name }]
            : []),
    ];

    return { stops, tools, totals };
}
