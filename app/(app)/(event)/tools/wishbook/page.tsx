'use client';

import { ArrowLeft, BookHeart, Heart, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import Avatar from '@/components/ui/avatar';
import { CURRENT_USER_ID, getUser, users, wishbookEntries } from '@/lib/mock-data';
import type { WishbookEntry } from '@/lib/types';
import { timeAgoParts } from '@/lib/utils';

export default function WishbookPage() {
    const t = useTranslations('WishbookPage');
    const router = useRouter();
    const currentUser = getUser(CURRENT_USER_ID);
    const [entries, setEntries] = useState<WishbookEntry[]>(wishbookEntries);
    const [message, setMessage] = useState('');
    const [likedEntries, setLikedEntries] = useState<Set<string>>(new Set());

    function handleLike(id: string) {
        setLikedEntries((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!message.trim()) return;
        const newEntry: WishbookEntry = {
            id: `w-new-${Date.now()}`,
            userId: CURRENT_USER_ID,
            message: message.trim(),
            createdAt: new Date().toISOString(),
            likes: 0,
        };
        setEntries((prev) => [newEntry, ...prev]);
        setMessage('');
    }

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleMessageChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(event.target.value);
    }, []);

    const handleLikeClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const entryId = event.currentTarget.dataset.entryId;
        if (entryId) handleLike(entryId);
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <button
                    onClick={handleBack}
                    aria-label={t('goBack')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <BookHeart className="w-5 h-5 text-pink-400" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            <p className="text-sm text-ink-muted mb-6 leading-relaxed">{t('subtitle')}</p>

            {/* Write a message */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" alt={currentUser.name} />
                    <p className="text-sm font-semibold text-ink">{currentUser.name}</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <textarea
                        value={message}
                        onChange={handleMessageChange}
                        rows={4}
                        placeholder={t('messagePlaceholder')}
                        className="w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
                        aria-label={t('messageAriaLabel')}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        className="self-end flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                        <Send className="w-3.5 h-3.5" />
                        {t('addToWishbook')}
                    </button>
                </form>
            </div>

            {/* Entries */}
            <h2 className="text-sm font-bold text-ink mb-4">{t('messageCount', { count: entries.length })}</h2>
            <div className="flex flex-col gap-4">
                {entries.map((entry) => {
                    const entryUser = users.find((u) => u.id === entry.userId) ?? currentUser;
                    const liked = likedEntries.has(entry.id);
                    const likeCount = entry.likes + (liked ? 1 : 0);

                    return (
                        <div key={entry.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <Avatar initials={entryUser.initials} color={entryUser.avatarColor} size="sm" alt={entryUser.name} />
                                    <div>
                                        <p className="text-sm font-semibold text-ink leading-tight">{entryUser.name}</p>
                                        <p className="text-xs text-ink-faint leading-tight">
                                            {(() => {
                                                const timeAgo = timeAgoParts(entry.createdAt);
                                                return t(`timeAgo.${timeAgo.unit}`, {
                                                    count: timeAgo.value,
                                                });
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    data-entry-id={entry.id}
                                    onClick={handleLikeClick}
                                    aria-pressed={liked}
                                    aria-label={liked ? t('unlikeMessage') : t('likeMessage')}
                                    className="flex items-center gap-1 text-xs font-medium transition-colors group"
                                >
                                    <Heart
                                        className={`w-4 h-4 transition-colors ${liked ? 'fill-primary text-primary' : 'text-ink-faint group-hover:text-primary/60'}`}
                                        strokeWidth={liked ? 0 : 1.8}
                                    />
                                    {likeCount > 0 && <span className={liked ? 'text-primary' : 'text-ink-faint'}>{likeCount}</span>}
                                </button>
                            </div>
                            <p className="text-sm text-ink leading-relaxed">{entry.message}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
