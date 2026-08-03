'use client';

import { ArrowLeft, Music, Plus, ThumbsUp, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { playlist as initialPlaylist } from '@/lib/mock-data';
import type { PlaylistItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const momentKey: Record<PlaylistItem['requestedFor'], string> = {
    ceremony: 'ceremony',
    cocktail: 'cocktail',
    reception: 'reception',
    'first-dance': 'firstDance',
};

const momentColors: Record<PlaylistItem['requestedFor'], string> = {
    ceremony: 'bg-rose-50 text-rose-500',
    cocktail: 'bg-amber-50 text-amber-500',
    reception: 'bg-violet-50 text-violet-500',
    'first-dance': 'bg-sky-50 text-sky-500',
};

type MomentFilter = PlaylistItem['requestedFor'] | 'all';

export default function PlaylistPage() {
    const t = useTranslations('PlaylistPage');
    const [items, setItems] = useState(initialPlaylist);
    const [filter, setFilter] = useState<MomentFilter>('all');
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newArtist, setNewArtist] = useState('');
    const [newMoment, setNewMoment] = useState<PlaylistItem['requestedFor']>('reception');

    function handleVote(id: string) {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          votes: item.voted ? item.votes - 1 : item.votes + 1,
                          voted: !item.voted,
                      }
                    : item
            )
        );
    }

    function handleAdd(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!newTitle.trim() || !newArtist.trim()) return;
        const newItem: PlaylistItem = {
            id: `pl-new-${Date.now()}`,
            title: newTitle.trim(),
            artist: newArtist.trim(),
            addedById: 'u3',
            requestedFor: newMoment,
            votes: 0,
            voted: false,
        };
        setItems((prev) => [...prev, newItem]);
        setNewTitle('');
        setNewArtist('');
        setShowAdd(false);
    }

    const filtered = (filter === 'all' ? items : items.filter((i) => i.requestedFor === filter)).sort((a, b) => b.votes - a.votes);

    const moments: MomentFilter[] = ['all', 'ceremony', 'cocktail', 'first-dance', 'reception'];

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between py-4 mb-2">
                <div className="flex items-center gap-3">
                    <Link
                        href="/tools"
                        aria-label={t('backToTools')}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Music className="w-5 h-5 text-violet-500" />
                        <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                    </div>
                </div>
                <button
                    onClick={() => setShowAdd((s) => !s)}
                    aria-label={showAdd ? t('cancel') : t('suggestASong')}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors',
                        showAdd ? 'bg-surface-muted text-ink-muted' : 'bg-gradient-brand text-white hover:opacity-90'
                    )}
                >
                    {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAdd ? t('cancel') : t('suggest')}
                </button>
            </div>

            {/* Add song form */}
            {showAdd && (
                <form onSubmit={handleAdd} className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-5 flex flex-col gap-3">
                    <h2 className="text-sm font-bold text-ink">{t('suggestASong')}</h2>
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={t('songTitle')}
                        required
                        className="w-full bg-surface-muted rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    <input
                        type="text"
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        placeholder={t('artist')}
                        required
                        className="w-full bg-surface-muted rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    <select
                        value={newMoment}
                        onChange={(e) => setNewMoment(e.target.value as PlaylistItem['requestedFor'])}
                        className="w-full bg-surface-muted rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                        aria-label={t('momentForSong')}
                    >
                        {(Object.keys(momentKey) as PlaylistItem['requestedFor'][]).map((m) => (
                            <option key={m} value={m}>
                                {t(`moments.${momentKey[m]}`)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={!newTitle.trim() || !newArtist.trim()}
                        className="w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                        {t('addToPlaylist')}
                    </button>
                </form>
            )}

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
                {moments.map((m) => (
                    <button
                        key={m}
                        onClick={() => setFilter(m)}
                        className={cn(
                            'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize',
                            filter === m ? 'bg-primary text-white' : 'bg-surface-muted text-ink-muted hover:text-ink'
                        )}
                    >
                        {m === 'all' ? t('allSongs') : t(`moments.${momentKey[m as PlaylistItem['requestedFor']]}`)}
                    </button>
                ))}
            </div>

            {/* Songs list */}
            <div className="flex flex-col gap-2.5">
                {filtered.map((item, i) => (
                    <div key={item.id} className="bg-card rounded-2xl border border-border/50 shadow-sm flex items-center gap-4 px-4 py-3.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-ink-muted tabular-nums">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-ink-muted truncate">{item.artist}</span>
                                <span className="text-ink-faint text-xs">·</span>
                                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', momentColors[item.requestedFor])}>
                                    {t(`moments.${momentKey[item.requestedFor]}`)}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleVote(item.id)}
                            aria-pressed={item.voted}
                            aria-label={item.voted ? t('removeVote') : t('voteForThisSong')}
                            className={cn(
                                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-11',
                                item.voted ? 'bg-primary-light text-primary' : 'text-ink-faint hover:bg-surface-muted hover:text-ink-muted'
                            )}
                        >
                            <ThumbsUp className={cn('w-4 h-4', item.voted ? 'fill-primary' : '')} strokeWidth={item.voted ? 0 : 1.8} />
                            <span className="text-[11px] font-bold tabular-nums">{item.votes}</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
