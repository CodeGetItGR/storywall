'use client';

import { Heart } from 'lucide-react';
import { useMemo } from 'react';

import type { ReactionTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface ReactionSummaryProps {
    count: number;
    counts?: Record<string, number>;
    reactionTypes?: ReactionTypeResponseDto[];
    className?: string;
}

export function ReactionSummary({ count, counts = {}, reactionTypes = [], className }: ReactionSummaryProps) {
    const topReactions = useMemo(
        () =>
            reactionTypes
                .map((type) => ({ ...type, count: counts[type.code] ?? 0 }))
                .filter((type) => type.count > 0)
                .sort((left, right) => right.count - left.count || left.sortOrder - right.sortOrder)
                .slice(0, 3),
        [counts, reactionTypes]
    );

    return (
        <div className={cn('flex items-center gap-1.5 text-sm text-ink', className)}>
            {topReactions.length > 0 ? (
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
            ) : (
                <Heart className="h-5 w-5" strokeWidth={1.8} />
            )}
            <span className="tabular-nums">{count}</span>
        </div>
    );
}
