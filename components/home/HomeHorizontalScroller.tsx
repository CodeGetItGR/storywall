'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface HomeHorizontalScrollerProps {
    children: ReactNode;
    previousLabel: string;
    nextLabel: string;
    className?: string;
}

export function HomeHorizontalScroller({ children, previousLabel, nextLabel, className }: HomeHorizontalScrollerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollPrevious, setCanScrollPrevious] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const updateScrollState = useCallback(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        setCanScrollPrevious(scroller.scrollLeft > 1);
        setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 1);
    }, []);

    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;

        updateScrollState();
        scroller.addEventListener('scroll', updateScrollState, { passive: true });

        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(scroller);

        return () => {
            scroller.removeEventListener('scroll', updateScrollState);
            resizeObserver.disconnect();
        };
    }, [updateScrollState]);

    function scrollByPage(direction: -1 | 1) {
        const scroller = scrollRef.current;
        if (!scroller) return;

        scroller.scrollBy({ left: direction * Math.max(scroller.clientWidth * 0.75, 220), behavior: 'smooth' });
    }

    function handlePreviousClick() {
        scrollByPage(-1);
    }

    function handleNextClick() {
        scrollByPage(1);
    }

    return (
        <div className="group/scroller relative">
            {/* Scrollable row */}
            <div
                ref={scrollRef}
                className={cn(
                    'flex items-stretch gap-3 overflow-x-auto scroll-smooth touch-no-scrollbar px-4 pb-3',
                    className
                )}
            >
                {children}
            </div>

            {/* Desktop row navigation */}
            <button
                type="button"
                onClick={handlePreviousClick}
                aria-label={previousLabel}
                disabled={!canScrollPrevious}
                className="absolute top-1/2 left-2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-ink shadow-sm backdrop-blur transition hover:border-ink-muted disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <button
                type="button"
                onClick={handleNextClick}
                aria-label={nextLabel}
                disabled={!canScrollNext}
                className="absolute top-1/2 right-2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-ink shadow-sm backdrop-blur transition hover:border-ink-muted disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
            </button>
        </div>
    );
}
