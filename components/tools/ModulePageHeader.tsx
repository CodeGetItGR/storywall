'use client';

import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { cn } from '@/lib/utils';

interface ModulePageHeaderProps {
    title: string;
    icon: LucideIcon;
    iconClassName?: string;
    showIcon?: boolean;
    backLabel: string;
    backHref: ComponentPropsWithoutRef<typeof BackButton>['href'];
    action?: ReactNode;
}

export function ModulePageHeader({ title, icon: Icon, iconClassName, showIcon = true, backLabel, backHref, action }: ModulePageHeaderProps) {
    return (
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-background py-4">
            <BackButton variant="icon" href={backHref} label={backLabel} />
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                {showIcon && <Icon className={cn('h-5 w-5 shrink-0', iconClassName)} aria-hidden="true" />}
                <h1 className="truncate text-base font-bold text-ink text-c">{title}</h1>
            </div>
            {action ?? <span className="h-9 w-9 shrink-0" aria-hidden="true" />}
        </div>
    );
}
