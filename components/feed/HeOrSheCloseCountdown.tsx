'use client';

import { useTranslations } from 'next-intl';

import { useCountdown } from '@/hooks/useCountdown';

/** Days / hours / minutes / seconds until voting closes. Gone once it passes: the view refetches as closed. */
export function HeOrSheCloseCountdown({ time }: { time: number }) {
    const t = useTranslations('Countdown');
    const tPage = useTranslations('HeOrShePage');
    const { days, hours, minutes, seconds, hasFinished } = useCountdown(time);

    if (hasFinished) return null;

    const parts = [
        { key: 'days', label: t('days'), count: days },
        { key: 'hours', label: t('hours'), count: hours },
        { key: 'minutes', label: t('minutes'), count: minutes },
        { key: 'seconds', label: t('seconds'), count: seconds },
    ];

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Label */}
            <p className="alegreya text-sm text-ink-muted italic">{tPage('closesIn')}</p>

            {/* Timer */}
            <div className="flex items-start justify-center gap-5" role="timer">
                {parts.map((part) => (
                    <div key={part.key} className="flex min-w-10 flex-col items-center" aria-label={`${part.count} ${part.label}`}>
                        <span className="abhaya-body text-2xl leading-none font-bold text-ink tabular-nums">{String(part.count).padStart(2, '0')}</span>
                        <span className="alegreya mt-1 text-xs leading-none text-ink-muted">{part.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
