'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { eventDescriptionViewsKey } from '@/lib/storageKeys';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_VIEWS = 2;

function readViewCount(eventId: string) {
    if (typeof window === 'undefined') {
        return 0;
    }

    const raw = window.localStorage.getItem(eventDescriptionViewsKey(eventId));
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function EventDescription({ eventId, description, className }: { eventId: string; description: string; className?: string }) {
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
            <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-dark">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-7 text-pretty text-ink-muted">{description}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
