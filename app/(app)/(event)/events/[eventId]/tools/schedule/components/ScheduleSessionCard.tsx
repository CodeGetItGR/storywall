'use client';

import { Church, MapPin, Martini } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ScheduleMapPreview } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleMapPreview';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface ScheduleSessionCardProps {
    session: EventSessionResponseDto;
    locationContent?: ReactNode;
    timeContent?: ReactNode;
    className?: string;
}

export function ScheduleSessionCard({
    session,
    locationContent,
    timeContent,
    className,
}: ScheduleSessionCardProps) {
    const t = useTranslations('SchedulePage');
    const isManagedSession = session.isMain || session.isSecondary;
    const SessionIcon = session.isMain ? Church : session.isSecondary ? Martini : null;

    return (
        <article
            className={cn(
                'relative rounded-2xl border bg-card p-4 shadow-sm transition-colors',
                isManagedSession &&
                    'bg-[linear-gradient(135deg,rgba(255,111,160,0.10),rgba(255,122,89,0.055)_46%,rgba(255,178,89,0.11))] shadow-[0_12px_26px_rgba(36,31,26,0.06)]',
                isManagedSession ? 'border-primary/20' : 'border-border/60',
                className
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <div className="min-w-0 w-full">
                    {/* Session title */}
                    <div className="flex items-center gap-2 justify-between">
                        <div className={'flex gap-2'}>
                        {SessionIcon && (
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/72 text-primary shadow-[0_8px_18px_rgba(36,31,26,0.06)]">
                                <SessionIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                        )}
                        <h3 className="text-xl font-semibold leading-snug text-ink">{session.title}</h3>
                        </div>
                        <div className="gap-2 text-sm">
                            {timeContent}
                        </div>
                    </div>
                    {session.description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{session.description}</p>}
                </div>
            </div>

            {locationContent}

            {session.mapsUrl && (
                <div className={cn('mt-3 grid gap-2', !locationContent && 'mt-4')}>
                    {session.locationName && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
                            <span className="font-medium text-ink-muted">{session.locationName}</span>
                        </div>
                    )}
                    <ScheduleMapPreview
                        mapsUrl={session.mapsUrl}
                        title={t('host.openMap', { title: session.title })}
                        openLabel={t('host.openInGoogleMaps')}
                        previewLabel={t('host.mapPreview')}
                        unavailableLabel={t('host.mapPreviewUnavailable')}
                    />
                </div>
            )}

            {!session.mapsUrl && session.locationName && !locationContent && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-ink-muted">{session.locationName}</span>
                </div>
            )}
        </article>
    );
}
