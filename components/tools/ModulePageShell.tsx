import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { ModulePageHeader } from '@/components/tools/ModulePageHeader';
import { cn } from '@/lib/utils';

type ModulePageMaxWidth = 'xl' | '2xl' | '3xl' | '5xl';

interface ModulePageShellProps {
    maxWidth?: ModulePageMaxWidth;
    title: string;
    icon: LucideIcon;
    iconClassName?: string;
    backLabel: string;
    backHref?: string;
    onBack?: () => void;
    action?: ReactNode;
    subtitle?: ReactNode;
    notice?: ReactNode;
    children: ReactNode;
}

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
    backLabel,
    backHref,
    onBack,
    action,
    subtitle,
    notice,
    children,
}: ModulePageShellProps) {
    return (
        <div className={cn('mx-auto px-4 pb-24 lg:pb-8', maxWidthClassName[maxWidth])}>
            <ModulePageHeader
                title={title}
                icon={icon}
                iconClassName={iconClassName}
                backLabel={backLabel}
                backHref={backHref}
                onBack={onBack}
                action={action}
            />
            {subtitle && <p className="mb-5 text-sm leading-relaxed text-ink-muted text-center">{subtitle}</p>}
            {notice}
            {children}
        </div>
    );
}
