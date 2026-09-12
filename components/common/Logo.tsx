import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
    direction?: 'row' | 'col';
    iconClassName?: string;
    wordmarkClassName?: string;
    /** 'gradient' masks the wordmark with the icon's brand gradient instead of rendering its flat fill. */
    wordmarkVariant?: 'default' | 'gradient';
    className?: string;
}

export function Logo({
    direction = 'row',
    iconClassName = 'h-8 w-auto sm:h-18 md:h-20',
    wordmarkClassName = 'h-6 w-auto sm:h-7 md:h-8',
    wordmarkVariant = 'default',
    className,
}: LogoProps) {
    return (
        <div className={cn('flex items-center gap-3', direction === 'col' ? 'flex-col' : 'flex-row', className)}>
            <Image src="/assets/Logo.svg" loading="eager" alt="StoryWall" width={30} height={32} className={iconClassName} unoptimized />
            {wordmarkVariant === 'gradient' ? (
                <GradientWordmark className={wordmarkClassName} />
            ) : (
                <Image src="/assets/LogoText.svg" loading="eager" alt="StoryWall" width={117} height={28} className={wordmarkClassName} unoptimized />
            )}
        </div>
    );
}

function GradientWordmark({ className }: { className?: string }) {
    return (
        <span
            role="img"
            aria-label="StoryWall"
            className={cn('inline-block aspect-117/28', className)}
            style={{
                backgroundImage: 'linear-gradient(132deg, #C777B1 20%, #E48279 43%, #F2885C 54%, #FEC463 99%)',
                WebkitMaskImage: 'url(/assets/LogoText.svg)',
                maskImage: 'url(/assets/LogoText.svg)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
            }}
        />
    );
}
