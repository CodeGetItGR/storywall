'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function RsvpPrompt({ eventId, deadline, className }: { eventId: string; deadline: string | null; className?: string }) {
    const t = useTranslations('RsvpPrompt');
    const locale = useLocale();
    const router = useRouter();

    const formattedDeadline = deadline
        ? new Intl.DateTimeFormat(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          }).format(new Date(deadline))
        : null;

    const go = useCallback(
        (attending: 'attending' | 'not-attending') => {
            router.push(routes.events.tools.rsvpSubmit(eventId, attending));
        },
        [eventId, router]
    );

    const handleClick = useCallback(
        (status: 'attending' | 'not-attending') => () => {
            go(status);
        },
        [go]
    );

    return (
        <div className={cn('flex items-center justify-between gap-2 bg-orangish py-3 px-4 rounded-full', className)}>
            <div className={'pl-2'}>
                <p className="text-sm font-bold text-ink">{t('willYouAttend')}</p>
                {formattedDeadline && <p className="text-xs text-ink-muted mt-0.5">{t('until', { date: formattedDeadline })}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={handleClick('attending')}
                    className="flex gap-2 px-4 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <Image src="/icons/yes.svg" alt={t('yes')} width={15} height={15} unoptimized />
                    {t('yes')}
                </button>
                <button
                    type="button"
                    onClick={handleClick('not-attending')}
                    className="flex gap-2 px-4 py-2 rounded-full border border-border text-ink-muted text-sm font-semibold hover:border-primary/40 hover:text-ink transition-colors"
                >
                    <Image src="/icons/no.svg" alt={t('no')} width={12} height={12} unoptimized />
                    {t('no')}
                </button>
            </div>
        </div>
    );
}
