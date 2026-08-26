import { Heart } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

export function ReactionCount({
    count,
    wrapperClassName,
    iconClassName,
    iconStrokeWidth,
}: {
    count: number;
    wrapperClassName?: string;
    iconClassName?: string;
    iconStrokeWidth?: number;
}) {
    return (
        <div className={cn(wrapperClassName, 'flex items-center gap-2')}>
            <Heart className={cn(iconClassName, 'h-5 w-5')} strokeWidth={iconStrokeWidth} />
            <p className={'tabular-nums'}>{count}</p>
        </div>
    );
}
