import { cn } from '@/lib/utils';

// Top row of a plan card holding the "most popular" badge. The row keeps its
// height on desktop so side-by-side cards line up.
export function PlanCardPopularBadge({ label }: { label: string | null }) {
    return (
        <div className={cn('flex min-h-6 items-center', !label && 'hidden min-[761px]:flex')}>
            {label && <span className="rounded-full bg-[#f29380]/20 px-2.5 py-1 text-[11px] leading-none font-bold">{label}</span>}
        </div>
    );
}
