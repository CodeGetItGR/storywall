import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

function Counter({ text, count }: { text: string; count: number }) {
    return (
        <div className="flex flex-col items-center">
            <span className="abhaya-body font-bold text-black">{count}</span>
            <span className="text-[1.2rem] lg:text-[1.5rem] text-black/60 alegreya">{text}</span>
        </div>
    );
}

export function Countdown({ time, className }: { time: number; className?: string }) {
    const t = useTranslations('Countdown');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

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
        <div className={cn(className, `flex justify-between gap-4`)}>
            <Counter text={t('days')} count={days} />
            <Counter text={t('hours')} count={hours} />
            <Counter text={t('minutes')} count={minutes} />
            <Counter text={t('seconds')} count={seconds} />
        </div>
    );
}
