import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ToolEmptyStateProps {
    title: string;
    body?: string;
    icon?: LucideIcon;
    iconSrc?: string;
    iconFrame?: 'gradient' | 'plain';
    iconAreaClassName?: string;
    iconClassName?: string;
    previewIconClassName?: string;
    action?: ReactNode;
    className?: string;
}

export function ToolEmptyState({
    title,
    body,
    icon: Icon,
    iconSrc,
    iconFrame = 'gradient',
    iconAreaClassName,
    iconClassName,
    previewIconClassName,
    action,
    className,
}: ToolEmptyStateProps) {
    const hasGradientIcon = iconFrame === 'gradient';

    return (
        <section className={cn('px-4 py-10 text-center', className)}>
            <div className="relative isolate overflow-hidden px-4 py-8">
                {/* Icon */}
                <div className={cn('relative mx-auto flex h-24 w-24 items-center justify-center', iconAreaClassName)}>
                    <div className="absolute inset-0 rounded-full bg-background shadow-[0_12px_34px_rgba(36,31,26,0.1)]" />
                    <div className="absolute -right-1 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(255,122,89,0.32)]">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div
                        className={cn(
                            'relative flex h-16 w-16 items-center justify-center',
                            hasGradientIcon ? 'rounded-full bg-gradient-brand text-primary-foreground' : 'text-ink-muted'
                        )}
                    >
                        {Icon ? (
                            <Icon className={cn('h-8 w-8', !hasGradientIcon && 'h-16 w-16', iconClassName)} strokeWidth={1.8} aria-hidden="true" />
                        ) : null}
                        {iconSrc ? (
                            <Image
                                src={iconSrc}
                                alt=""
                                width={72}
                                height={72}
                                className={cn('h-12 w-12', !hasGradientIcon && 'h-18 w-18', iconClassName)}
                                unoptimized
                            />
                        ) : null}
                    </div>
                </div>

                {/* Message */}
                <div className="relative mt-6">
                    <h2 className="text-xl font-semibold text-ink">{title}</h2>
                    {body ? <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-ink-muted">{body}</p> : null}
                </div>

                {/* Action */}
                {action ? <div className="relative mt-6">{action}</div> : null}

                {/* Preview marks */}
                <div className="relative mx-auto mt-7 flex max-w-[15rem] items-center justify-center gap-2 text-ink-faint">
                    <span className="h-px flex-1 bg-border" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-[0_8px_20px_rgba(36,31,26,0.07)]">
                        {Icon ? <Icon className={cn('h-4 w-4', previewIconClassName)} strokeWidth={1.8} aria-hidden="true" /> : null}
                        {iconSrc ? (
                            <Image src={iconSrc} alt="" width={20} height={20} className={cn('h-5 w-5', previewIconClassName)} unoptimized />
                        ) : null}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                </div>
            </div>
        </section>
    );
}
