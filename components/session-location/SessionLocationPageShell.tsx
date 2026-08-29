'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BackButton } from '@/components/ui/BackButton';
import { routes } from '@/lib/routes';
import type { SessionLocationViewModel } from '@/lib/sessionLocations';

import { SessionLocationIcon } from './SessionLocationIcon';

type SessionLocationPageShellProps = {
    eventId: string;
    location: SessionLocationViewModel;
};

export function SessionLocationPageShell({ eventId, location }: SessionLocationPageShellProps) {
    const t = useTranslations('SessionLocationPage');
    const hasLocationName = Boolean(location.locationName);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background px-6 pb-14 pt-4">
            {/* Header */}
            <header>
                <BackButton href={routes.events.feed(eventId)} label={t('back')} />
            </header>

            {/* Location */}
            <section className="flex flex-1 flex-col items-center justify-center gap-5 py-14 text-center">
                <div className="text-primary">
                    <SessionLocationIcon icon={location.icon} />
                </div>
                <div className="grid gap-2">
                    <h1 className="alegreya-light text-3xl leading-tight text-ink">{location.title}</h1>
                    <p className="text-lg text-ink-muted">{hasLocationName ? location.locationName : t('locationMissing')}</p>
                </div>
                {location.mapsUrl && (
                    <a
                        href={location.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-linear-to-r from-[#c777b1] via-[#f2885c] to-[#fec463] px-6 text-base font-semibold text-white shadow-[0_12px_24px_rgba(242,136,92,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        {t('map')}
                        <MapPin className="h-5 w-5 fill-white/25" strokeWidth={2.4} aria-hidden="true" />
                    </a>
                )}
            </section>
        </main>
    );
}
