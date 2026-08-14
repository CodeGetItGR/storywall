import type { ComponentType, ReactNode } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { cn } from '@/lib/utils';

interface AddSongFieldShellProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    children: ReactNode;
    required?: boolean;
    optional?: boolean;
    iconClassName?: string;
}

export function AddSongFieldShell({ icon: Icon, label, children, required, optional, iconClassName }: AddSongFieldShellProps) {
    return (
        <FormFieldLabel
            label={
                <span className="flex items-center gap-2">
                    <Icon className={cn('h-4.5 w-4.5 text-primary', iconClassName)} />
                    {label}
                </span>
            }
            indicator={required ? 'required' : optional ? 'optional' : undefined}
            className="group block"
            labelClassName="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint"
        >
            {children}
        </FormFieldLabel>
    );
}
