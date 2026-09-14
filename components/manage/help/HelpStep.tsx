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
    body: string;
    complete: boolean;
    actions: HelpStepAction[];
    isLast?: boolean;
}

export function HelpStep({ index, title, body, complete, actions, isLast }: HelpStepProps) {
    return (
        <li className="relative flex gap-4 pb-8 last:pb-0">
            {/* Connector line */}
            {!isLast && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" aria-hidden="true" />}

            {/* Step marker */}
            <span
                className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    complete ? 'bg-primary text-white' : 'border border-border bg-surface-muted text-ink-muted'
                )}
            >
                {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index}
            </span>

            {/* Step content */}
            <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                {actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {actions.map((action) => (
                            <Link
                                key={action.key}
                                href={action.href}
                                className="inline-flex min-h-8 items-center text-sm font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            >
                                {action.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </li>
    );
}
