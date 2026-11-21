'use client';

import { useTranslations } from 'next-intl';

import { announcementComposerHref, isAnnouncementOpen } from '@/lib/announcementComposer';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { useContentAccessMode } from '@/providers/EventProvider';

// The Overview's Announcement (On the day quick tool, After stop): the feed with
// the composer open in Announcement mode, or null while the host can't post one.
// The public demo has no announcement handlers.
export function useHostAnnouncementLink(event: EventDetailResponseDto): { label: string; href: string } | null {
    const t = useTranslations('PostCard');
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';

    if (isDemoVisitor || !isAnnouncementOpen(event)) return null;
    return { label: t('announcement'), href: announcementComposerHref(event.id) };
}
