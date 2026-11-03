import { cn } from '@/lib/utils';

// The vendor's role as a badge ("Partner" without one), so guests can tell the card apart from a post.
export function PartnerCardLabel({ partnerLabel, roleLabel, className }: { partnerLabel: string; roleLabel: string | null; className?: string }) {
    return (
        <span className={cn('flex min-w-0 items-center text-xs font-semibold text-ink-muted', className)}>
            <span className="truncate rounded-sm bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                {roleLabel ?? partnerLabel}
            </span>
        </span>
    );
}
