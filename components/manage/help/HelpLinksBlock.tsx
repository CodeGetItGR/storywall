import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface HelpLinkItem {
    key: string;
    href: string;
    label: string;
}

interface HelpLinksBlockProps {
    step: number;
    title: string;
    body: string;
    items: HelpLinkItem[];
}

export function HelpLinksBlock({ step, title, body, items }: HelpLinksBlockProps) {
    const hasCompactActions = items.length <= 2;

    return (
        <>
            {/* Help destinations */}
            <section className="mx-auto border-t border-border/70 pt-7 first:border-t-0 first:pt-0">
                {/* Section heading */}
                <div className={cn('sm:max-w-xl')}>
                    {/* Title */}
                    <div className="relative">
                        <span className="absolute left-0 top-0 text-sm font-semibold tabular-nums text-primary" aria-hidden="true">
                            {String(step).padStart(2, '0')}
                        </span>
                        <h3 className="px-8 text-center text-base font-semibold text-ink">{title}</h3>
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>

                {/* Destination actions */}
                <div className={cn('mt-4', hasCompactActions ? 'flex flex-wrap gap-x-6 gap-y-1 justify-center' : 'flex flex-col')}>
                    {items.map((item) => {
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={cn(
                                    'group inline-flex min-h-10 items-center gap-2.5 py-2 text-sm font-semibold text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                                    !hasCompactActions && 'w-full'
                                )}
                            >
                                <span className="truncate">{item.label}</span>
                                <ArrowRight
                                    className={cn(
                                        'h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary',
                                        !hasCompactActions && 'ml-auto'
                                    )}
                                    aria-hidden="true"
                                />
                            </Link>
                        );
                    })}
                </div>
            </section>
        </>
    );
}
