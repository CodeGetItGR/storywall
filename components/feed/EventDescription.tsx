'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { eventDescriptionViewsKey } from '@/lib/storageKeys';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_VIEWS = 35;

function readViewCount(eventId: string) {
    if (typeof window === 'undefined') {
        return 0;
    }

    const raw = window.localStorage.getItem(eventDescriptionViewsKey(eventId));
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function EventDescription({
    eventId,
    description,
    className,
}: {
    eventId: string;
    description: string;
    className?: string;
}) {
    const t = useTranslations('FeedPage');
    const sectionRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const storageKey = eventDescriptionViewsKey(eventId);
        const currentViews = readViewCount(eventId);
        const section = sectionRef.current;

        if (!section) {
            return;
        }

        if (currentViews >= MAX_VISIBLE_VIEWS) {
            section.hidden = true;
            return;
        }

        window.localStorage.setItem(storageKey, String(currentViews + 1));
        section.hidden = false;
        section.classList.remove('invisible');
    }, [eventId]);

    return (
        <section ref={sectionRef} className={cn('invisible pt-2', className)}>
            <div className="border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,241,230,0.8))] px-4 py-4 shadow-[0_10px_30px_rgba(36,31,26,0.05)]">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-dark">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">{t('aboutEvent')}</p>
                        <p className="mt-1 max-w-[65ch] text-[15px] leading-7 text-ink-muted text-balance">{description}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
