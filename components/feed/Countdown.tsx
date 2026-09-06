import { useTranslations } from 'next-intl';

import { CountdownCounter } from '@/components/feed/CountdownCounter';
import { CountdownFireworks } from '@/components/feed/CountdownFireworks';
import { useCountdown } from '@/hooks/useCountdown';
import { useCountdownCelebration } from '@/hooks/useCountdownCelebration';
import { cn } from '@/lib/utils';

export function Countdown({ eventId, time, className }: { eventId: string; time: number; className?: string }) {
    const t = useTranslations('Countdown');
    const { days, hours, minutes, seconds, hasFinished } = useCountdown(time);

    const { shouldCelebrate, onCelebrationComplete } = useCountdownCelebration({ eventId, hasFinished, targetTime: time });

    if (hasFinished) {
        return (
            <div className={cn(className, 'flex shrink-0 items-center')}>
                <span className="abhaya-body text-[1.4rem] font-bold text-black xxs:text-[1.55rem] xs:text-[1.75rem] sm:text-[1.95rem] md:text-[2.1rem] lg:text-[2.2rem]">
                    {t('started')}
                </span>
                {shouldCelebrate && <CountdownFireworks onCompleteAction={onCelebrationComplete} />}
            </div>
        );
    }

    return (
        <div className={cn(className, 'flex shrink-0 justify-between gap-2 xxs:gap-2.5 md:gap-3')}>
            <CountdownCounter text={t('days')} shortText={t('daysShort')} count={days} />
            <CountdownCounter text={t('hours')} shortText={t('hoursShort')} count={hours} />
            <CountdownCounter text={t('minutes')} shortText={t('minutesShort')} count={minutes} />
            <CountdownCounter text={t('seconds')} shortText={t('secondsShort')} count={seconds} />
        </div>
    );
}
