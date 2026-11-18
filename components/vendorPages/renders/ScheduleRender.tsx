import { Church, MapPin, Martini } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Skeleton } from '@/components/ui/skeleton';
import { VENDOR_RENDER_DATE } from '@/components/vendorPages/renders/renderSample';
import { formatDate } from '@/lib/datetime';

// The schedule page's timeline, with sample sessions. Same look as ScheduleTimelineItem and ScheduleSessionCard, without their headings.
export async function ScheduleRender() {
    const locale = await getLocale();
    const tSchedule = await getTranslations('SchedulePage');
    const tMoments = await getTranslations('PlaylistPage.moments');
    const t = await getTranslations('VendorPages.renders.schedule');
    const sessions = [
        { time: '18:00', Icon: Church, title: tMoments('ceremony'), place: t('ceremonyPlace') },
        { time: '20:30', Icon: Martini, title: tMoments('reception'), place: t('receptionPlace') },
    ];

    return (
        <div className="min-h-full bg-background p-4">
            {/* View toggle */}
            <div className="mx-auto mb-5 flex w-fit rounded-full bg-surface-muted p-1">
                <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">{tSchedule('views.edit')}</span>
                <span className="rounded-full bg-background px-3.5 py-1.5 text-xs font-semibold text-ink shadow-sm">{tSchedule('views.public')}</span>
            </div>

            {/* Day */}
            <p className="m-0 mb-3 text-base font-bold text-ink first-letter:uppercase">
                {formatDate(locale, `${VENDOR_RENDER_DATE}T00:00:00`, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {/* Timeline */}
            <ol className="m-0 list-none p-0">
                {sessions.map(({ time, Icon, title, place }, index) => {
                    const isLast = index === sessions.length - 1;
                    return (
                        <li key={time} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
                            {/* Rail */}
                            <div className="relative flex justify-center">
                                <span className="relative z-10 mt-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                                {!isLast && <span className="absolute top-4 -bottom-1.5 w-0.5 rounded-full bg-primary/20" />}
                            </div>

                            {/* Session */}
                            <div className={isLast ? undefined : 'pb-6'}>
                                <p className="m-0 text-sm font-semibold text-ink tabular-nums">{time}</p>
                                <div className="mt-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <p className="m-0 min-w-0 text-lg leading-snug font-semibold text-ink">{title}</p>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="font-medium">{place}</span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
                {/* More sessions */}
                <li className="mt-6 grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
                    <div className="flex justify-center">
                        <span className="mt-1.5 h-3 w-3 rounded-full bg-surface-muted" />
                    </div>
                    <div>
                        <Skeleton className="h-3 w-12 rounded-full" />
                        <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                            <Skeleton className="h-4 w-3/5 rounded-full" />
                            <Skeleton className="mt-3 h-3 w-4/5 rounded-full" />
                        </div>
                    </div>
                </li>
            </ol>
        </div>
    );
}
