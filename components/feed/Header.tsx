import { Logo } from '@/components/common/Logo';

import { Countdown } from './Countdown';

export function Header({ countdownTime }: { countdownTime: number }) {
    return (
        <div className="sticky top-0 z-20 w-full bg-background/90 backdrop-blur-sm shadow-[0_12px_20px_-18px_rgba(36,31,26,0.24)]">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 px-4 py-5">
                <Logo direction="row" wordmarkClassName="h-6 w-auto xxs:h-7 xs:h-8 sm:h-12" />
                {/* Countdown */}
                <Countdown time={countdownTime} className="ml-2" />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 translate-y-full bg-linear-to-b from-ink/14 via-ink/6 to-transparent blur-[6px]"
                />
            </div>
        </div>
    );
}
