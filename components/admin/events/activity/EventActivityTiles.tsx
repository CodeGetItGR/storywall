'use client';

import { BookHeart, Briefcase, CalendarCheck, CircleDashed, CircleHelp, Heart, Images, ListMusic, MessageCircle, StickyNote, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventActivityTile } from '@/components/admin/events/activity/EventActivityTile';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { ACTIVITY_COLORS, reactionsSummary, removedKinds, removedTotal } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';

const NEUTRAL = '#5f6b7a';

// Every count in one grid. Module tiles appear only when the response carries them; the
// professional and removed tiles only when there is something to show.
export function EventActivityTiles({ totals, removed }: { totals: AdminEventActivityDto['totals']; removed: AdminEventActivityDto['removed'] }) {
    const t = useTranslations('AdminPage.events.activity');
    const { count } = useFunnelFormat();
    const removedCount = removedTotal(removed);
    const removedParts = removedKinds(removed)
        .map((kind) => t(`removed.${kind}`, { count: removed[kind] }))
        .join(' · ');
    const reactions = reactionsSummary(totals.reactionsByType, count) || undefined;

    return (
        <div data-testid="activity-tiles" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {/* Feed */}
            <EventActivityTile icon={StickyNote} tint={ACTIVITY_COLORS.posts} label={t('tiles.posts')} value={count(totals.posts)} detail={t('tiles.postMedia', { count: totals.postMedia })} />
            <EventActivityTile icon={CircleDashed} tint={ACTIVITY_COLORS.stories} label={t('tiles.stories')} value={count(totals.stories)} detail={t('tiles.storyViews', { count: totals.storyViews })} />
            <EventActivityTile icon={Images} tint={ACTIVITY_COLORS.gallery} label={t('tiles.gallery')} value={count(totals.galleryUploads)} detail={t('tiles.viaQr', { count: count(totals.galleryViaQr) })} />
            {totals.wishes !== null && <EventActivityTile icon={BookHeart} tint={ACTIVITY_COLORS.wishes} label={t('tiles.wishes')} value={count(totals.wishes)} />}
            <EventActivityTile icon={Heart} tint="#d4537e" label={t('tiles.reactions')} value={count(totals.reactions)} detail={reactions} title={reactions} />
            <EventActivityTile icon={MessageCircle} tint={NEUTRAL} label={t('tiles.comments')} value={count(totals.comments)} />
            {/* Modules */}
            {totals.playlist && (
                <EventActivityTile icon={ListMusic} tint="#6250d6" label={t('tiles.playlist')} value={count(totals.playlist.suggestions)} detail={t('tiles.votes', { count: totals.playlist.votes })} />
            )}
            {totals.quizAnswers !== null && <EventActivityTile icon={CircleHelp} tint="#6250d6" label={t('tiles.quiz')} value={count(totals.quizAnswers)} />}
            {totals.rsvp && (
                <EventActivityTile icon={CalendarCheck} tint={NEUTRAL} label={t('tiles.rsvp')} value={count(totals.rsvp.attending)} detail={t('tiles.declined', { count: count(totals.rsvp.declined) })} />
            )}
            {totals.proUploads > 0 && <EventActivityTile icon={Briefcase} tint={NEUTRAL} label={t('tiles.pro')} value={count(totals.proUploads)} />}
            {/* Removed */}
            {removedCount > 0 && <EventActivityTile icon={Trash2} tint={NEUTRAL} label={t('tiles.removed')} value={count(removedCount)} detail={removedParts} />}
        </div>
    );
}
