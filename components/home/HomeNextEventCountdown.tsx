import { useTranslations } from 'next-intl';

import { useCountdown } from '@/hooks/useCountdown';

export function HomeNextEventCountdown({ time }: { time: number }) {
    const t = useTranslations('Countdown');
    const { days, hours, minutes, seconds, hasFinished } = useCountdown(time);

    if (hasFinished) return null;

    return (
        <div className="absolute inset-x-0 top-0 flex items-center justify-center bg-gradient-to-b from-black/90 via-black/60 to-transparent py-2.5">
            <span className="abhaya-body text-base font-bold tabular-nums text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] xs:text-lg sm:text-xl">
                {days > 0 && `${days}${t('daysShort')} `}
                {`${hours}${t('hoursShort')} ${minutes}${t('minutesShort')} ${seconds}${t('secondsShort')}`}
            </span>
        </div>
    );
}
