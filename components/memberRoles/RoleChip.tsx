import { cn } from '@/lib/utils';

const toneClass = {
    default: 'bg-surface-muted text-ink-muted',
    onMuted: 'bg-background text-ink-muted',
    onDark: 'bg-white/15 text-white',
} as const;

export function RoleChip({
    label,
    tone = 'default',
    onClick,
    ariaLabel,
}: {
    label: string;
    tone?: keyof typeof toneClass;
    onClick?: () => void;
    ariaLabel?: string;
}) {
    const className = cn('inline-block max-w-[16ch] shrink-0 truncate rounded-full px-2 py-0.5 align-middle text-[11px] leading-4 font-semibold', toneClass[tone]);

    if (onClick) {
        return (
            <button type="button" onClick={onClick} aria-label={ariaLabel} title={label} className={cn(className, 'transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none')}>
                {label}
            </button>
        );
    }

    return (
        <span title={label} className={className}>
            {label}
        </span>
    );
}
