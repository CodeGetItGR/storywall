'use client';

import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleMapPreview } from '@/components/schedule/ScheduleMapPreview';
import { BackButton } from '@/components/ui/BackButton';
import { useSessionLocationWhen } from '@/hooks/useSessionLocationWhen';
import { routes } from '@/lib/routes';
import type { SessionLocationViewModel } from '@/lib/sessionLocations';

import { SessionLocationIcon } from './SessionLocationIcon';

type SessionLocationPageShellProps = {
    eventId: string;
    location: SessionLocationViewModel;
};

export function SessionLocationPageShell({ eventId, location }: SessionLocationPageShellProps) {
    const t = useTranslations('SessionLocationPage');
    const tSchedule = useTranslations('SchedulePage.host');
    const when = useSessionLocationWhen(location);

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col bg-background px-6 pt-4 pb-10">
            {/* Header */}
            <header>
                <BackButton href={routes.events.feed(eventId)} label={t('back')} />
            </header>

            {/* Location */}
            <section className="flex flex-col items-center gap-5 pt-10 text-center">
                <div className="text-primary">
                    <SessionLocationIcon icon={location.icon} />
                </div>
                <h1 className="alegreya-light text-3xl leading-tight text-ink">{location.title}</h1>
                {location.description && <p className="max-w-md text-base leading-relaxed text-ink-muted">{location.description}</p>}
            </section>

            {/* Details */}
            <section className="mt-8 grid gap-3 text-ink">
                {when && (
                    <p className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span>{when.date}</span>
                    </p>
                )}
                {when?.time && (
                    <p className="flex items-center gap-3 tabular-nums">
                        <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span>{when.time}</span>
                    </p>
                )}
                <p className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className={location.locationName ? undefined : 'text-ink-muted'}>{location.locationName || t('locationMissing')}</span>
                </p>
            </section>

            {/* Map */}
            {location.mapsUrl && (
                <section className="mt-6">
                    <ScheduleMapPreview
                        mapsUrl={location.mapsUrl}
                        title={tSchedule('openMap', { title: location.title })}
                        openLabel={tSchedule('openInGoogleMaps')}
                        previewLabel={tSchedule('mapPreview')}
                        unavailableLabel={tSchedule('mapPreviewUnavailable')}
                        heightClassName="h-80"
                    />
                </section>
            )}
        </main>
    );
}
