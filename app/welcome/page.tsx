'use client';

import { ArrowRight, CalendarPlus, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

// A pasted invite can be the raw token or a full /invite/{token} link —
// take whatever's after the last slash, or the whole trimmed string if
// there isn't one.
function extractInviteToken(value: string): string {
    const trimmed = value.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
}

export default function WelcomePage() {
    const t = useTranslations('WelcomePage');
    const router = useRouter();
    const { memberships, isLoading } = useEventSwitcher();

    const [inviteInput, setInviteInput] = useState('');

    // Someone who already belongs to an event doesn't belong here.
    useEffect(() => {
        if (!isLoading && memberships.length > 0) router.replace(routes.feed);
    }, [isLoading, memberships, router]);

    function handleInviteSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const token = extractInviteToken(inviteInput);
        if (token) router.push(routes.inviteToken(token));
    }

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-ink mb-1">{t('title')}</h2>
            <p className="text-sm text-ink-muted mb-7 leading-relaxed">{t('subtitle')}</p>

            <button
                type="button"
                onClick={() => router.push(routes.events.new)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                <CalendarPlus className="w-4 h-4" />
                {t('createEventCta')}
                <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-ink-faint uppercase tracking-wide">{t('or')}</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('haveInviteLabel')}</span>
                    <div className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition">
                        <Ticket className="w-4 h-4 text-ink-muted shrink-0" />
                        <input
                            type="text"
                            placeholder={t('inviteInputPlaceholder')}
                            value={inviteInput}
                            onChange={(e) => setInviteInput(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                        />
                    </div>
                </label>
                <button
                    type="submit"
                    disabled={!inviteInput.trim()}
                    className="w-full py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-surface-muted/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {t('goButton')}
                </button>
            </form>
        </AuthLayout>
    );
}
