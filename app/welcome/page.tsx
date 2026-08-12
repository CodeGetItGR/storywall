'use client';

import { ArrowRight, CalendarPlus, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { extractInviteToken } from '@/lib/invite/tokens';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

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

    const handleCreateEvent = useCallback(() => {
        router.push(routes.events.new);
    }, [router]);

    const handleInviteInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setInviteInput(event.target.value);
    }, []);

    return (
        <AuthLayout>
            <h2 className="mb-1 text-2xl font-bold text-ink">{t('title')}</h2>
            <p className="mb-7 text-sm leading-relaxed text-ink-muted">{t('subtitle')}</p>

            <button
                type="button"
                onClick={handleCreateEvent}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
                <CalendarPlus className="h-4 w-4" />
                {t('createEventCta')}
                <ArrowRight className="h-4 w-4" />
            </button>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-ink-faint">{t('or')}</span>
                <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('haveInviteLabel')}</span>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                        <Ticket className="h-4 w-4 shrink-0 text-ink-muted" />
                        <input
                            type="text"
                            placeholder={t('inviteInputPlaceholder')}
                            value={inviteInput}
                            onChange={handleInviteInputChange}
                            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                        />
                    </div>
                </label>
                <button
                    type="submit"
                    disabled={!inviteInput.trim()}
                    className="w-full rounded-full bg-surface-muted py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {t('goButton')}
                </button>
            </form>
        </AuthLayout>
    );
}
