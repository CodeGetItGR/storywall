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
        [eventId, router],
    );

    const handleClick = useCallback(
        (status: 'attending' | 'not-attending') => () => {
            go(status);
        },
        [go],
    );

    return (
        <div className={cn('flex items-center justify-between gap-2 rounded-full bg-orangish px-4 py-3', className)}>
            <div className={'pl-2'}>
                <p className="text-sm font-bold text-ink">{t('willYouAttend')}</p>
                {formattedDeadline && <p className="mt-0.5 text-xs text-ink-muted">{t('until', { date: formattedDeadline })}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={handleClick('attending')}
                    className="flex gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    <Image src="/icons/yes.svg" alt={t('yes')} width={15} height={15} unoptimized />
                    {t('yes')}
                </button>
                <button
                    type="button"
                    onClick={handleClick('not-attending')}
                    className="flex gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                >
                    <Image src="/icons/no.svg" alt={t('no')} width={12} height={12} unoptimized />
                    {t('no')}
                </button>
            </div>
        </div>
    );
}
