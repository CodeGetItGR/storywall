'use client';

import { ArrowUp } from 'lucide-react';

import { useScrolledPastViewport } from '@/hooks/useScrolledPastViewport';
import { cn } from '@/lib/utils';

export function ModuleScrollTopButton({ label }: { label: string }) {
    const isVisible = useScrolledPastViewport();

    function handleClick() {
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={label}
            tabIndex={isVisible ? 0 : -1}
            className={cn(
                'fixed right-5 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-[0_12px_32px_rgba(35,28,22,0.18)] transition-all hover:bg-primary-light hover:text-primary-dark sm:right-8 sm:bottom-8 lg:bottom-8',
                isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            )}
        >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}
