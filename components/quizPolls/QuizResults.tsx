'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import type { QuizPollsViewDto } from '@/lib/api/types';
import { getInitials } from '@/lib/format';
import { cn } from '@/lib/utils';

/** The caller's score and the leaderboard. The server sends them to hosts always and to everyone once closed. */
export function QuizResults({ view, memberId }: { view: QuizPollsViewDto; memberId: string | null }) {
    const t = useTranslations('QuizPollsPage');
    const leaderboard = view.leaderboard;
    if (!leaderboard) return null;

    return (
        <section className="space-y-4">
            {/* Score */}
            {view.myScore && (
                <p className="rounded-2xl bg-primary-light px-4 py-4 text-center text-base font-semibold text-primary-dark">
                    {t('score', { correct: view.myScore.correct, total: view.myScore.total })}
                </p>
            )}

            {/* Leaderboard */}
            <div className="space-y-2">
                <h2 className="text-base font-semibold text-ink">{t('leaderboardTitle')}</h2>
                {leaderboard.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('noAnswers')}</p>
                ) : (
                    <ol className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface-muted/60">
                        {leaderboard.map((entry) => {
                            const isMe = entry.memberId === memberId;
                            return (
                                <li key={entry.memberId} className={cn('flex items-center gap-3 px-4 py-2.5', isMe && 'bg-primary-light/60')}>
                                    <span className="w-6 shrink-0 text-center text-sm font-semibold text-ink-muted tabular-nums">{entry.rank}</span>
                                    <Avatar size="xs" src={entry.avatarUrl} initials={getInitials(entry.displayName)} alt={entry.displayName} />
                                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                                        {isMe ? t('you', { name: entry.displayName }) : entry.displayName}
                                    </span>
                                    <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                                        {t('rightCount', { count: entry.correct })}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
}
