import { cn } from '@/lib/utils';

// The visible name under a tab's icon. The tab's own aria-label already names it, so this is hidden from screen readers.
export function TabLabel({ label, active, className }: { label: string; active: boolean; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'line-clamp-2 max-w-full text-center text-[0.6875rem] leading-tight font-medium tracking-tight text-ink transition-opacity duration-200',
                active ? 'opacity-100' : 'opacity-60',
                className,
            )}
        >
            {label}
        </span>
    );
}

// The icon box: smaller when a label sits under it, so both fit the bar's height.
export function tabIconBoxClass(showLabel: boolean): string {
    return showLabel ? 'h-7 w-7' : 'h-10 w-10';
}

// The tab's own box: a labelled tab takes its column's full width so the label can wrap inside it.
export function tabBoxClass(showLabel: boolean): string {
    return showLabel ? 'w-full px-0.5' : 'min-w-12 px-3';
}
