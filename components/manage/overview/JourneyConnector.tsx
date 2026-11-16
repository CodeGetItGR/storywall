import { useId } from 'react';

import { cn } from '@/lib/utils';

type Orientation = 'vertical' | 'horizontal' | 'stem';

const PATHS: Record<Orientation, { forward: string; reverse: string }> = {
    vertical: { forward: 'M10 0 C10 55 90 45 90 100', reverse: 'M90 0 C90 55 10 45 10 100' },
    horizontal: { forward: 'M0 15 C55 15 45 85 100 85', reverse: 'M0 85 C55 85 45 15 100 15' },
    stem: { forward: 'M50 0 L50 100', reverse: 'M50 0 L50 100' },
};

/**
 * The curve from one stop to the next. Vertical (small screens) runs from one side to the other;
 * horizontal (desktop) runs from the top row to the lower one or back; stem runs straight down beside
 * the current card. Solid gradient once walked.
 */
export function JourneyConnector({
    orientation,
    reverse,
    walked,
    className,
}: {
    orientation: Orientation;
    reverse?: boolean;
    walked: boolean;
    className?: string;
}) {
    const gradientId = useId();
    const across = orientation === 'horizontal';
    const d = reverse ? PATHS[orientation].reverse : PATHS[orientation].forward;
    return (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={cn('block overflow-visible', className)}>
            {/* Gradient */}
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2={across ? '1' : '0'} y2={across ? '0' : '1'}>
                    <stop offset="0%" stopColor="#c777b1" />
                    <stop offset="50%" stopColor="#e48279" />
                    <stop offset="100%" stopColor="#f2885c" />
                </linearGradient>
            </defs>
            {/* Curve */}
            <path
                d={d}
                fill="none"
                vectorEffect="non-scaling-stroke"
                stroke={walked ? `url(#${gradientId})` : '#f0e2d2'}
                strokeWidth={walked ? 5 : 6}
                strokeLinecap="round"
                strokeDasharray={walked ? undefined : '0 12'}
            />
        </svg>
    );
}
