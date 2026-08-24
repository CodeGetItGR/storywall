import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

function Counter({ text, shortText, count }: { text: string; shortText: string; count: number }) {
    return (
        <div className="flex min-w-6 flex-col items-center" aria-label={`${count} ${text}`}>
            <span className="abhaya-body text-[1.05rem] font-bold tabular-nums leading-none text-black xs:text-[1.3rem] sm:text-[1.45rem]">
                {count}
            </span>
            <span className="alegreya text-[0.65rem] leading-none text-black/60 xxs:text-[0.8rem] sm:text-[0.95rem]">{shortText}</span>
        </div>
    );
}

export function Countdown({ time, className }: { time: number; className?: string }) {
    const t = useTranslations('Countdown');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1_000);

        return () => clearInterval(interval);
    }, []);

    const { days, hours, minutes, seconds } = useMemo(() => {
        const target = new Date(time).getTime();
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return { days, hours, minutes, seconds };
    }, [time, now]);

    return (
        <div className={cn(className, 'flex shrink-0 justify-between gap-1.5 xxs:gap-2 md:gap-3')}>
            <Counter text={t('days')} shortText={t('daysShort')} count={days} />
            <Counter text={t('hours')} shortText={t('hoursShort')} count={hours} />
            <Counter text={t('minutes')} shortText={t('minutesShort')} count={minutes} />
            <Counter text={t('seconds')} shortText={t('secondsShort')} count={seconds} />
        </div>
    );
}
