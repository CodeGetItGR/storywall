'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface OnboardingLinkItem {
    key: string;
    icon: LucideIcon;
    iconClassName: string;
    href: string;
    label: string;
}

interface OnboardingLinksStepProps {
    title: string;
    body: string;
    items: OnboardingLinkItem[];
    onNavigate: () => void;
}

export function OnboardingLinksStep({ title, body, items, onNavigate }: OnboardingLinksStepProps) {
    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="text-center">
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            onClick={onNavigate}
                            className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary/30 hover:bg-primary-light/20"
                        >
                            <Icon className={cn('h-5 w-5 shrink-0', item.iconClassName)} aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
