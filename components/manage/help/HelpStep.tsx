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
            <span className="relative z-10 flex h-8 w-14 shrink-0 items-center justify-end gap-1.5">
                {complete && <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                <span
                    className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                        complete ? 'border-emerald-600 text-emerald-600' : 'border-border text-ink-muted'
                    )}
                >
                    {index}
                </span>
            </span>

            {/* Step content */}
            <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    {actions.map((action) => (
                        <Link
                            key={action.key}
                            href={action.href}
                            className="inline-flex min-h-6 items-center text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
