import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
    direction?: 'row' | 'col';
    iconClassName?: string;
    wordmarkClassName?: string;
    className?: string;
}

export function Logo({
    direction = 'row',
    iconClassName = 'h-8 w-auto sm:h-18 md:h-20',
    wordmarkClassName = 'h-6 w-auto sm:h-7 md:h-8',
    className,
}: LogoProps) {
    return (
        <div className={cn('flex items-center gap-3', direction === 'col' ? 'flex-col' : 'flex-row', className)}>
            <Image src="/assets/Logo.svg" loading="eager" alt="StoryWall" width={30} height={32} className={iconClassName} unoptimized />
            <Image src="/assets/LogoText.svg" loading="eager" alt="StoryWall" width={117} height={28} className={wordmarkClassName} unoptimized />
        </div>
    );
}
