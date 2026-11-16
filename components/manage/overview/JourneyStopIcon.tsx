import { Check } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import type { JourneyStopModel } from '@/lib/eventJourney';
import { journeyIcons } from '@/lib/journeyIcons';
import { cn } from '@/lib/utils';

/** The stop's circle: a check when done, the gradient when current, the icon when still to come. */
export function JourneyStopIcon({ stop }: { stop: JourneyStopModel }) {
    const t = useTranslations('ManagePage');
    const icon = journeyIcons[stop.icon];

    if (stop.status === 'done') {
        return (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
                <span className="sr-only">{t('journey.phases.done')}</span>
            </span>
        );
    }

    const current = stop.status === 'current';
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                current
                    ? 'h-[4.5rem] w-[4.5rem] text-white shadow-[0_8px_24px_rgba(242,136,92,0.35)] ring-8 ring-primary/10 bg-gradient-logo'
                    : 'h-14 w-14 border-2 border-[#f0e2d2] bg-event text-ink-muted',
            )}
        >
            {current && stop.badge ? (
                <span className="text-base font-bold">{stop.badge}</span>
            ) : icon.kind === 'image' ? (
                <Image src={icon.src} alt={stop.title} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
            ) : (
                <icon.icon className="h-6 w-6" aria-label={stop.title} role="img" />
            )}
        </span>
    );
}
