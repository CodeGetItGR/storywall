import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

import { ModulePageHeader } from '@/components/tools/ModulePageHeader';
import { cn } from '@/lib/utils';

type ModulePageMaxWidth = 'xl' | '2xl' | '3xl' | '5xl';

// A page either gets the usual back-link header or its own header in its place (a lite event's home).
type ModulePageShellHeaderProps =
    | { header: ReactElement; backLabel?: never; backHref?: never }
    | { header?: undefined; backLabel: string; backHref: ComponentPropsWithoutRef<typeof ModulePageHeader>['backHref'] };

type ModulePageShellProps = ModulePageShellHeaderProps & {
    maxWidth?: ModulePageMaxWidth;
    title: string;
    icon?: LucideIcon;
    iconClassName?: string;
    showTitleIcon?: boolean;
    action?: ReactNode;
    subtitle?: ReactNode;
    notice?: ReactNode;
    children: ReactNode;
    className?: string;
};

const maxWidthClassName: Record<ModulePageMaxWidth, string> = {
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
};

export function ModulePageShell({
    maxWidth = '2xl',
    title,
    icon,
    iconClassName,
    showTitleIcon = true,
    header,
    backLabel,
    backHref,
    action,
    subtitle,
    notice,
    children,
    className,
}: ModulePageShellProps) {
    return (
        <div className={cn('mx-auto px-4 pb-8', maxWidthClassName[maxWidth], className)}>
            {/* Header */}
            {header === undefined ? (
                <ModulePageHeader
                    title={title}
                    icon={icon}
                    iconClassName={iconClassName}
                    showIcon={showTitleIcon}
                    backLabel={backLabel}
                    backHref={backHref}
                    action={action}
                />
            ) : (
                header
            )}
            {subtitle && <p className="mb-5 text-center text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
            {notice}
            {children}
        </div>
    );
}
