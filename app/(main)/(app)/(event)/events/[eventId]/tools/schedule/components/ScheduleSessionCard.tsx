'use client';

import { Church, MapPin, Martini, PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleMapPreview } from '@/components/schedule/ScheduleMapPreview';
import type { EventSessionResponseDto, EventTypeConvention } from '@/lib/api/types';
import { resolveLocationKind } from '@/lib/sessionLocations';
import { cn } from '@/lib/utils';

interface ScheduleSessionCardProps {
    session: EventSessionResponseDto;
    // Undefined while the event loads: the main session then shows no icon rather than a wrong one.
    eventType?: EventTypeConvention;
    className?: string;
}

export function ScheduleSessionCard({ session, eventType, className }: ScheduleSessionCardProps) {
    const t = useTranslations('SchedulePage');
    const mainKind = eventType ? resolveLocationKind(eventType, 'main') : null;
    const MainIcon = mainKind === 'church' ? Church : mainKind ? PartyPopper : null;
    const SessionIcon = session.isMain ? MainIcon : session.isSecondary ? Martini : null;

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
                        showLabel={t('host.showMap')}
                        consentLabel={t('host.mapConsent')}
                    />
                </div>
            )}
        </article>
    );
}
