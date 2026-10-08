import { cn } from '@/lib/utils';

// "Partner" and the role, so guests can tell the card apart from a post.
export function PartnerCardLabel({ partnerLabel, roleLabel, className }: { partnerLabel: string; roleLabel: string | null; className?: string }) {
    return (
        <span className={cn('flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink-muted', className)}>
            <span className="shrink-0 rounded-sm bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">{partnerLabel}</span>
            {roleLabel && <span className="truncate">{roleLabel}</span>}
        </span>
    );
}
