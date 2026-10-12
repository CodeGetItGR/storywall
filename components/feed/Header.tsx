import Link from 'next/link';

import { Logo } from '@/components/common/Logo';
import { routes } from '@/lib/routes';

import { Countdown } from './Countdown';

export function Header({ countdownTime, eventId }: { countdownTime: number; eventId: string }) {
    return (
        <div className="sticky top-0 z-20 w-full bg-event">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <Link href={routes.landing} className="rounded-lg">
                    <Logo direction="row" wordmarkClassName="h-7 w-auto xxs:h-6 xs:h-8 sm:h-8" />
                </Link>
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>
        </div>
    );
}
