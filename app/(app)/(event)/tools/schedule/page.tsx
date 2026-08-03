import { ArrowLeft, Calendar, Clock, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { scheduleEvents } from '@/lib/mock-data';

const typeColors: Record<string, string> = {
    ceremony: 'bg-rose-100 text-rose-600 border-rose-200',
    reception: 'bg-violet-100 text-violet-600 border-violet-200',
    'pre-wedding': 'bg-amber-100 text-amber-600 border-amber-200',
    social: 'bg-sky-100 text-sky-600 border-sky-200',
};

const typeIconColor: Record<string, string> = {
    ceremony: 'bg-rose-50 border-rose-200',
    reception: 'bg-violet-50 border-violet-200',
    'pre-wedding': 'bg-amber-50 border-amber-200',
    social: 'bg-sky-50 border-sky-200',
};

const typeKey: Record<string, string> = {
    ceremony: 'ceremony',
    reception: 'reception',
    'pre-wedding': 'preWedding',
    social: 'social',
};

export default function SchedulePage() {
    const t = useTranslations('SchedulePage');
    const locale = useLocale();

    function formatDate(dateStr: string): string {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    const grouped: Record<string, typeof scheduleEvents> = {};
    for (const event of scheduleEvents) {
        if (!grouped[event.date]) grouped[event.date] = [];
        grouped[event.date].push(event);
    }
    const sortedDates = Object.keys(grouped).sort();

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <Link
                    href="/tools"
                    aria-label={t('backToTools')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            <p className="text-sm text-ink-muted mb-6 leading-relaxed">{t('subtitle')}</p>

            {/* Timeline */}
            <div className="flex flex-col gap-8">
                {sortedDates.map((date) => (
                    <section key={date}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center justify-center">
                                <span className="text-[9px] text-ink-muted uppercase font-medium leading-none">
                                    {new Date(date + 'T00:00:00').toLocaleString(locale, {
                                        month: 'short',
                                    })}
                                </span>
                                <span className="text-sm font-bold text-ink leading-none">{new Date(date + 'T00:00:00').getDate()}</span>
                            </div>
                            <p className="text-sm font-bold text-ink">{formatDate(date)}</p>
                        </div>

                        <div className="relative pl-5 flex flex-col gap-4">
                            {/* Vertical line */}
                            <div className="absolute left-[8px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

                            {grouped[date].map((event) => (
                                <div key={event.id} className="relative">
                                    {/* Dot */}
                                    <div
                                        className={`absolute -left-5 top-3 w-3.5 h-3.5 rounded-full border-2 border-background ${typeIconColor[event.type]}`}
                                        aria-hidden="true"
                                    />

                                    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <h3 className="text-sm font-semibold text-ink leading-snug">{event.title}</h3>
                                            <span
                                                className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[event.type]}`}
                                            >
                                                {t(`eventTypes.${typeKey[event.type]}`)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-ink-muted leading-snug mb-2">{event.description}</p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="flex items-center gap-1 text-xs text-ink-muted">
                                                <Clock className="w-3 h-3" aria-hidden="true" />
                                                {event.time}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-ink-muted">
                                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                                {event.location}
                                            </span>
                                            {event.attending && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                    <Users className="w-3 h-3" aria-hidden="true" />
                                                    {t('attendingCount', {
                                                        count: event.attending,
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
