'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';
import { cn } from '@/lib/utils';

interface HostAnswer {
    memberId: string;
    displayName: string;
    avatarUrl: string | null;
    text: string;
}

/** Who answered what, by name. Hosts only, folded away by default. */
export function HostAnswers({ answers, open, onToggleAction }: { answers: HostAnswer[]; open: boolean; onToggleAction: () => void }) {
    const t = useTranslations('QuizPollsPage');
    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={onToggleAction}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
                {open ? t('hideAnswers') : t('showAnswers')}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open &&
                (answers.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('noAnswers')}</p>
                ) : (
                    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface-muted/60">
                        {answers.map((answer) => (
                            <li key={answer.memberId} className="flex items-start gap-3 px-4 py-2.5">
                                <Avatar size="xs" src={answer.avatarUrl} initials={getInitials(answer.displayName)} alt="" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-ink-muted">{answer.displayName}</p>
                                    <p className="text-sm whitespace-pre-line text-ink">{answer.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ))}
        </div>
    );
}
