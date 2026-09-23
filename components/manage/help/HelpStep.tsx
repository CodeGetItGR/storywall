import { Check } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface HelpStepAction {
    key: string;
    href: string;
    label: string;
}

interface HelpStepProps {
    index: number;
    title: string;
    body?: string;
    complete: boolean;
    actions: HelpStepAction[];
    isLast?: boolean;
}

export function HelpStep({ index, title, body, complete, actions, isLast }: HelpStepProps) {
    return (
        <li className="relative flex gap-2 pb-7 last:pb-0">
            {/* Connector line */}
            {!isLast && <span className="absolute top-8 bottom-0 left-10 w-px bg-border" aria-hidden="true" />}

            {/* Step marker */}
            <div className="relative z-10 flex h-8 w-14 shrink-0 items-center gap-2">
                <Check className={cn('h-4 w-4 text-emerald-600 opacity-0', { 'opacity-100': complete })} aria-hidden="true" />
                <div
                    className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', {
                        'text-white': complete,
                        'border border-border text-ink-muted': !complete,
                    })}
                    style={{ backgroundColor: complete ? '#10B981' : 'transparent' }}
                >
                    {index}
                </div>
            </div>

            {/* Step content */}
            <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-col items-baseline gap-x-2 gap-y-0.5 sm:flex-row">
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    {actions.map((action) => (
                        <Link
                            key={action.key}
                            href={action.href}
                            className="inline-flex min-h-6 items-center text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                        >
                            {action.label}
                        </Link>
                    ))}
                </div>
                {body && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>}
            </div>
        </li>
    );
}
