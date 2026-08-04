'use client';

import { ArrowLeft, Clock, Lock, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import Avatar from '@/components/ui/avatar';
import { CURRENT_USER_ID, getUser } from '@/lib/mock-data';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type OpenOn = '1-year' | '5-years' | '10-years' | '25-years';

interface FutureMessage {
    id: string;
    author: string;
    openOn: OpenOn;
    preview: string;
    lockedAt: string;
}

const exampleMessages: FutureMessage[] = [
    {
        id: 'fm-1',
        author: 'Sophie Williams',
        openOn: '1-year',
        preview: 'A letter about your first year...',
        lockedAt: '2025-07-08T14:00:00Z',
    },
    {
        id: 'fm-2',
        author: 'Marcus Thompson',
        openOn: '5-years',
        preview: 'By now you have probably...',
        lockedAt: '2025-07-09T10:30:00Z',
    },
    {
        id: 'fm-3',
        author: 'Lily Park',
        openOn: '10-years',
        preview: 'Ten years of adventures...',
        lockedAt: '2025-07-10T16:00:00Z',
    },
];

export default function FutureMessagesPage() {
    const t = useTranslations('FutureMessagesPage');
    const openOnLabels: Record<OpenOn, string> = {
        '1-year': t('openOnLabels.1-year'),
        '5-years': t('openOnLabels.5-years'),
        '10-years': t('openOnLabels.10-years'),
        '25-years': t('openOnLabels.25-years'),
    };
    const openOnNames: Record<OpenOn, string> = {
        '1-year': t('openOnNames.1-year'),
        '5-years': t('openOnNames.5-years'),
        '10-years': t('openOnNames.10-years'),
        '25-years': t('openOnNames.25-years'),
    };
    const currentUser = getUser(CURRENT_USER_ID);
    const [message, setMessage] = useState('');
    const [openOn, setOpenOn] = useState<OpenOn>('1-year');
    const [submitted, setSubmitted] = useState(false);

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!message.trim()) return;
        setSubmitted(true);
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <Link
                    href={routes.tools.root}
                    aria-label={t('backToTools')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-teal-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <Clock className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-teal-700 leading-relaxed">{t('intro')}</p>
            </div>

            {submitted ? (
                <div className="flex flex-col items-center text-center py-12 px-4">
                    <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-5">
                        <Lock className="w-9 h-9 text-teal-500" />
                    </div>
                    <h2 className="text-xl font-bold text-ink mb-2">{t('messageSealed')}</h2>
                    <p className="text-sm text-ink-muted max-w-xs leading-relaxed">{t('sealedUntil', { openOn: openOnNames[openOn] })}</p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="mt-8 px-6 py-3 rounded-full bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors"
                    >
                        {t('writeAnother')}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Author row */}
                    <div className="flex items-center gap-3">
                        <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="md" alt={currentUser.name} />
                        <div>
                            <p className="text-sm font-semibold text-ink">{currentUser.name}</p>
                            <p className="text-xs text-ink-muted">{t('writingALetter')}</p>
                        </div>
                    </div>

                    {/* Open on */}
                    <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('openThisLetterOn')}</p>
                        <div className="flex flex-col gap-2">
                            {(Object.keys(openOnLabels) as OpenOn[]).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setOpenOn(key)}
                                    className={cn(
                                        'flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all',
                                        openOn === key
                                            ? 'border-teal-400 bg-teal-50 text-teal-700'
                                            : 'border-border text-ink-muted hover:border-teal-200'
                                    )}
                                >
                                    <span>{openOnLabels[key]}</span>
                                    {openOn === key && <div className="w-4 h-4 rounded-full bg-teal-400 flex-shrink-0" aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{t('yourMessage')}</p>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={8}
                            placeholder={t('messagePlaceholder')}
                            className="w-full bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-teal-400/30 resize-none transition leading-relaxed"
                            aria-label={t('messageAriaLabel')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!message.trim()}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-teal-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-600 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        {t('sealAndSend')}
                    </button>
                </form>
            )}

            {/* Sealed messages */}
            <div className="mt-8">
                <h2 className="text-sm font-bold text-ink mb-3">{t('messagesSealed', { count: exampleMessages.length })}</h2>
                <div className="flex flex-col gap-2.5">
                    {exampleMessages.map((msg) => (
                        <div key={msg.id} className="bg-card rounded-2xl border border-border/60 shadow-sm flex items-center gap-4 px-4 py-3.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-4 h-4 text-teal-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-ink truncate">{msg.author}</p>
                                <p className="text-xs text-teal-600 font-medium mt-0.5">{t('opens', { openOn: openOnNames[msg.openOn] })}</p>
                            </div>
                            <Lock className="w-4 h-4 text-ink-faint flex-shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
