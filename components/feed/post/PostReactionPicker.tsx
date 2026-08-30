'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ReactionSummary } from '@/components/feed/post/ReactionSummary';
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
    const rootRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<number | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const reaction = usePostLike(post);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current === null) return;
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }, []);

    const openMenu = useCallback(() => {
        clearCloseTimer();
        setMenuVisible(true);
        setIsClosing(false);
    }, [clearCloseTimer]);

    const closeMenu = useCallback(() => {
        if (!menuVisible || isClosing) return;
        clearCloseTimer();
        setIsClosing(true);
        closeTimerRef.current = window.setTimeout(() => {
            setMenuVisible(false);
            setIsClosing(false);
            closeTimerRef.current = null;
        }, 190);
    }, [clearCloseTimer, isClosing, menuVisible]);

    function toggleOpen() {
        if (disabled || reaction.isPending || reaction.options.length === 0) return;
        if (menuVisible) closeMenu();
        else openMenu();
    }

    async function selectReaction(event: React.MouseEvent<HTMLButtonElement>) {
        const reactionType = event.currentTarget.dataset.reactionType;
        if (!reactionType) return;
        closeMenu();
        if (reactionType === reaction.selectedType) {
            await reaction.clearReaction();
            return;
        }
        await reaction.selectReaction(reactionType);
    }

    useEffect(() => {
        if (!menuVisible) return;

        function handlePointerDown(event: PointerEvent) {
            if (rootRef.current?.contains(event.target as Node)) return;
            closeMenu();
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') closeMenu();
        }

        document.addEventListener('pointerdown', handlePointerDown, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeMenu, menuVisible]);

    useEffect(() => clearCloseTimer, [clearCloseTimer]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={toggleOpen}
                disabled={disabled || reaction.isPending || reaction.options.length === 0}
                aria-label={reaction.selectedType ? t('changeReaction') : t('reactToPost')}
                aria-expanded={menuVisible && !isClosing}
                aria-haspopup="menu"
                className={cn(
                    'flex min-h-10 items-center rounded-full px-1.5 py-2 text-sm font-medium text-ink-muted transition-[color,scale] hover:text-ink active:scale-[0.97]',
                    reaction.selectedType && 'text-ink',
                    disabled && 'cursor-not-allowed opacity-60 hover:text-ink-muted'
                )}
            >
                <ReactionSummary count={reaction.count} counts={reaction.counts} reactionTypes={reaction.options} />
            </button>

            {/* Reaction menu */}
            {menuVisible && (
                <div
                    role="menu"
                    data-closing={isClosing}
                    className="motion-reaction-picker absolute bottom-full left-0 z-20 mb-2 flex min-h-12 items-center gap-1 rounded-full bg-card px-2 py-1.5 shadow-lg"
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
                                    'motion-reaction-option flex h-9 w-9 items-center justify-center rounded-full text-lg transition-[scale] hover:scale-125 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                    selected && 'scale-125'
                                )}
                            >
                                <span aria-hidden>{option.emoji}</span>
                                <span className="sr-only">{option.name}</span>
                            </button>
                        );
                    })}
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
