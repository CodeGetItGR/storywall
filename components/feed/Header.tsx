import { Logo } from '@/components/common/Logo';

import { Countdown } from './Countdown';

export function Header({ countdownTime }: { countdownTime: number }) {
    return (
        <div className="sticky top-0 z-20 w-full bg-background">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 px-4 py-5">
                <Logo direction="row" wordmarkClassName="h-6 w-auto xxs:h-7 xs:h-8 sm:h-12" />
                {/* Countdown */}
                <Countdown time={countdownTime} className="ml-2" />
            </div>
        </div>
    );
}
