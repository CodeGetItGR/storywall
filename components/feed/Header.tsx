import { Logo } from '@/components/common/Logo';

import { Countdown } from './Countdown';

export function Header({ countdownTime }: { countdownTime: number }) {
    return (
        <div className={'py-5 px-4 flex gap-4 items-center justify-between sticky top-0 z-20 bg-background/90 backdrop-blur-sm w-full'}>
            <Logo direction="row" wordmarkClassName={'h-12'} />
            <Countdown time={countdownTime} className={'ml-2'} />
        </div>
    );
}
