'use client';

import { Heart, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { usePostLike } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import type { PostResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PostReactionPickerProps {
    post: PostResponseDto;
    disabled?: boolean;
}

export function PostReactionPicker({ post, disabled = false }: PostReactionPickerProps) {
    const t = useTranslations('PostCard');
    const toErrorMessage = useApiErrorMessage();
    const [open, setOpen] = useState(false);
    const reaction = usePostLike(post);
    const activeEmoji = reaction.selectedOption?.emoji;

    const topReactions = useMemo(
        () =>
            reaction.options
                .map((option) => ({ ...option, count: reaction.counts[option.code] ?? 0 }))
                .filter((option) => option.count > 0)
                .slice(0, 3),
        [reaction.counts, reaction.options]
    );

    function toggleOpen() {
        if (disabled || reaction.isPending || reaction.options.length === 0) return;
        setOpen((value) => !value);
    }

    async function selectReaction(event: React.MouseEvent<HTMLButtonElement>) {
        const reactionType = event.currentTarget.dataset.reactionType;
        if (!reactionType) return;
        setOpen(false);
        await reaction.selectReaction(reactionType);
    }

    async function clearReaction() {
        setOpen(false);
        await reaction.clearReaction();
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={toggleOpen}
                disabled={disabled || reaction.isPending || reaction.options.length === 0}
                aria-label={reaction.selectedType ? t('changeReaction') : t('reactToPost')}
                aria-expanded={open}
                aria-haspopup="menu"
                className={cn(
                    'flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-[background-color,color,scale] active:scale-[0.97]',
                    reaction.selectedType ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-muted',
                    disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent'
                )}
            >
                {activeEmoji ? (
                    <span key={reaction.selectedType} className="motion-reaction-selected text-lg leading-none" aria-hidden>
                        {activeEmoji}
                    </span>
                ) : (
                    <Heart className="h-5 w-5" strokeWidth={1.8} />
                )}
                <span className="tabular-nums">{reaction.count}</span>
                {topReactions.length > 1 && (
                    <span className="ml-0.5 hidden items-center -space-x-1 sm:inline-flex" aria-hidden>
                        {topReactions.map((option) => (
                            <span key={option.code} className="text-sm leading-none">
                                {option.emoji}
                            </span>
                        ))}
                    </span>
                )}
            </button>

            {/* Reaction menu */}
            {open && (
                <div
                    role="menu"
                    className="motion-reaction-picker absolute bottom-full left-0 z-20 mb-2 flex min-h-12 items-center gap-1 rounded-full border border-border bg-card px-2 py-1.5 shadow-lg"
                >
                    {reaction.options.map((option) => {
                        const selected = reaction.selectedType === option.code;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                data-reaction-type={option.code}
                                title={option.name}
                                onClick={selectReaction}
                                className={cn(
                                    'motion-reaction-option flex h-9 w-9 items-center justify-center rounded-full text-lg transition-[background-color,scale] hover:scale-110 hover:bg-surface-muted active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                    selected && 'bg-primary-light scale-110'
                                )}
                            >
                                <span aria-hidden>{option.emoji}</span>
                                <span className="sr-only">{option.name}</span>
                            </button>
                        );
                    })}
                    {reaction.selectedType && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={clearReaction}
                            title={t('removeReaction')}
                            className="motion-reaction-option flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-[background-color,color,scale] hover:scale-105 hover:bg-surface-muted hover:text-ink active:scale-95"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{t('removeReaction')}</span>
                        </button>
                    )}
                </div>
            )}

            {reaction.error !== null && reaction.error !== undefined && (
                <p className="absolute left-0 top-full mt-1 w-56 text-xs text-destructive">
                    {isModuleNotAvailableError(reaction.error) ? t('moduleUnavailable') : toErrorMessage(reaction.error, t('reactionFailed'))}
                </p>
            )}
        </div>
    );
}
