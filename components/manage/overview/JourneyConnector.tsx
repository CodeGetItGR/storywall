import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * The curve from one stop to the next. Vertical (small screens) runs from one side to the other;
 * horizontal (desktop) runs from the top row to the lower one or back. Solid gradient once walked.
 */
export function JourneyConnector({
    orientation,
    reverse,
    walked,
    className,
}: {
    orientation: 'vertical' | 'horizontal';
    reverse: boolean;
    walked: boolean;
    className?: string;
}) {
    const gradientId = useId();
    const d =
        orientation === 'vertical'
            ? reverse
                ? 'M90 0 C90 55 10 45 10 100'
                : 'M10 0 C10 55 90 45 90 100'
            : reverse
              ? 'M0 85 C55 85 45 15 100 15'
              : 'M0 15 C55 15 45 85 100 85';
    return (
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={cn('block overflow-visible', className)}>
            {/* Gradient */}
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2={orientation === 'vertical' ? '0' : '1'} y2={orientation === 'vertical' ? '1' : '0'}>
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
