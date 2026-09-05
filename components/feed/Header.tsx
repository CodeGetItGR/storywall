import { Logo } from '@/components/common/Logo';

import { Countdown } from './Countdown';

export function Header({ countdownTime, eventId }: { countdownTime: number; eventId: string }) {
    return (
        <div className="sticky top-0 z-20 w-full bg-background">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <Logo direction="row" wordmarkClassName="h-7 w-auto xxs:h-7 xs:h-8 sm:h-12" />
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>
        </div>
    );
}
