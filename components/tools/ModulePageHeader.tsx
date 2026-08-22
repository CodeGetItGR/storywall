'use client';

import { ArrowLeft, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ModulePageHeaderProps {
    title: string;
    icon: LucideIcon;
    iconClassName?: string;
    showIcon?: boolean;
    backLabel: string;
    backHref?: string;
    onBack?: () => void;
    action?: ReactNode;
}

const backButtonClassName =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted';

export function ModulePageHeader({
    title,
    icon: Icon,
    iconClassName,
    showIcon = true,
    backLabel,
    backHref,
    onBack,
    action,
}: ModulePageHeaderProps) {
    return (
        <div className="flex items-center gap-3 py-4">
            {backHref ? (
                <Link href={backHref} aria-label={backLabel} className={backButtonClassName}>
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            ) : (
                <button type="button" onClick={onBack} aria-label={backLabel} className={backButtonClassName}>
                    <ArrowLeft className="h-5 w-5" />
                </button>
            )}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                {showIcon && <Icon className={cn('h-5 w-5 shrink-0', iconClassName)} aria-hidden="true" />}
                <h1 className="truncate text-base font-bold text-ink">{title}</h1>
            </div>
            {action ?? <span className="h-9 w-9 shrink-0" aria-hidden="true" />}
        </div>
    );
}
