import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

function Counter({ text, shortText, count }: { text: string; shortText: string; count: number }) {
    return (
        <div className="flex min-w-8 flex-col items-center">
            <span className="abhaya-body text-[1.2rem] font-bold tabular-nums text-black xs:text-[1.5rem] sm:text-[1.7rem]">{count}</span>
            <span className="alegreya text-[0.7rem] text-black/60 xxs:text-[0.9rem] xs:text-[1.2rem] sm:text-[1.5rem]">
                <span className="xs:hidden">{shortText}</span>
                <span className="hidden xs:inline">{text}</span>
            </span>
        </div>
    );
}

export function Countdown({ time, className }: { time: number; className?: string }) {
    const t = useTranslations('Countdown');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 30_000);

        return () => clearInterval(interval);
    }, []);

    const { days, hours, minutes } = useMemo(() => {
        const target = new Date(time).getTime();
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0 };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    }, [time, now]);

    return (
        <div className={cn(className, 'flex shrink-0 justify-between gap-2 md:gap-4')}>
            <Counter text={t('days')} shortText={t('daysShort')} count={days} />
            <Counter text={t('hours')} shortText={t('hoursShort')} count={hours} />
            <Counter text={t('minutes')} shortText={t('minutesShort')} count={minutes} />
        </div>
    );
}
