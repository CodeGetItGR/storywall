'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

import { useHistoryBackClick } from '@/hooks/useHistoryBackClick';
import { cn } from '@/lib/utils';

type BackButtonProps = {
    href: ComponentPropsWithoutRef<typeof Link>['href'];
    label: string;
    variant?: 'link' | 'icon';
    className?: string;
    onClick?: ComponentPropsWithoutRef<typeof Link>['onClick'];
    // Go back to the previous page when it is in the app; href is only the fallback.
    historyBack?: boolean;
};

export function BackButton({ href, label, variant = 'link', className, onClick, historyBack = false }: BackButtonProps) {
    const handleClick = useHistoryBackClick(historyBack, onClick);

    if (variant === 'icon') {
        return (
            <Link
                href={href}
                onClick={handleClick}
                aria-label={label}
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted',
                    className,
                )}
            >
                <ArrowLeft className="h-5 w-5" />
            </Link>
        );
    }

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={cn('inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-primary-dark', className)}
        >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </Link>
    );
}
