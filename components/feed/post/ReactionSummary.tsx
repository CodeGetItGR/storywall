import { useMemo } from 'react';

import type { ReactionTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface ReactionSummaryProps {
    counts?: Record<string, number>;
    reactionTypes?: ReactionTypeResponseDto[];
    className?: string;
    maxReactions?: number;
}

export function ReactionSummary({ counts = {}, reactionTypes = [], className, maxReactions = 2 }: ReactionSummaryProps) {
    const topReactions = useMemo(
        () =>
            reactionTypes
                .map((type) => ({ ...type, count: counts[type.code] ?? 0 }))
                .filter((type) => type.count > 0)
                .sort((left, right) => right.count - left.count || left.sortOrder - right.sortOrder)
                .slice(0, maxReactions),
        [counts, maxReactions, reactionTypes]
    );

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (topReactions.length === 0) return null;

    return (
        <div className={cn('flex items-center gap-1.5 text-sm text-ink', className)}>
            <span className="flex items-center -space-x-0.5" aria-hidden>
                {topReactions.map((reaction) => (
                    <span
                        key={reaction.code}
                        className="motion-reaction-selected flex h-5 w-5 items-center justify-center rounded-full text-base leading-none"
                    >
                        {reaction.emoji}
                    </span>
                ))}
            </span>
            <p className={'tabular-nums pb-1'}>{totalCount}</p>
        </div>
    );
}
