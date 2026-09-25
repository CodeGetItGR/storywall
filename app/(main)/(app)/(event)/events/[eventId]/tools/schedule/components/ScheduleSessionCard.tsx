'use client';

import { Church, MapPin, Martini } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleMapPreview } from '@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleMapPreview';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface ScheduleSessionCardProps {
    session: EventSessionResponseDto;
    className?: string;
}

export function ScheduleSessionCard({ session, className }: ScheduleSessionCardProps) {
    const t = useTranslations('SchedulePage');
    const SessionIcon = session.isMain ? Church : session.isSecondary ? Martini : null;

    return (
        <article className={cn('rounded-2xl border border-border/60 bg-card p-4 shadow-sm', className)}>
            {/* Title */}
            <div className="flex items-center gap-2">
                {SessionIcon && (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SessionIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                )}
                <h3 className="min-w-0 text-lg leading-snug font-semibold text-ink">{session.title}</h3>
            </div>
            {session.description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{session.description}</p>}

            {/* Location */}
            {session.locationName && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-medium">{session.locationName}</span>
                </div>
            )}

            {/* Map */}
            {session.mapsUrl && (
                <div className="mt-2">
                    <ScheduleMapPreview
                        mapsUrl={session.mapsUrl}
                        title={t('host.openMap', { title: session.title })}
                        openLabel={t('host.openInGoogleMaps')}
                        previewLabel={t('host.mapPreview')}
                        unavailableLabel={t('host.mapPreviewUnavailable')}
                    />
                </div>
            )}
        </article>
    );
}
