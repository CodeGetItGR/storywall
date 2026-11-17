'use client';

import { ListChecks } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { usePinchZoomBox } from '@/hooks/usePinchZoomBox';
import { cn } from '@/lib/utils';

// Same layer as the composer button (z-46: over the tab bar, under every modal), phones only.
// The 44px tap area holds a 36px circle, centred on the 48px "+" (right-4). Raised = above "+"
// (the feed); otherwise it takes "+"'s spot just above the tab bar.
const layerClassName = 'pointer-events-none fixed inset-0 z-46 md:hidden';
const linkClassName =
    'motion-fab group pointer-events-auto absolute right-[18px] flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink/40';

interface OverviewFabButtonProps {
    href: string;
    // Screen-reader name; the badge number is decoration.
    label: string;
    // Steps left in the current phase; no badge for 0 or null.
    count: number | null;
    raised: boolean;
    // Animates the button out while an overlay is open.
    hidden: boolean;
}

export function OverviewFabButton({ href, label, count, raised, hidden }: OverviewFabButtonProps) {
    const pinchZoomBox = usePinchZoomBox();

    return (
        <div className={layerClassName} style={pinchZoomBox}>
            {/* Overview */}
            <AppLink
                href={href}
                aria-label={label}
                inert={hidden}
                data-hidden={hidden || undefined}
                className={cn(linkClassName, raised ? 'bottom-[136px]' : 'bottom-[82px]')}
            >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-mint text-ink shadow-md transition-transform duration-150 ease-out group-active:scale-95">
                    <ListChecks className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />

                    {/* Steps left */}
                    {count !== null && count > 0 && (
                        <span
                            data-testid="overview-fab-badge"
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-white"
                        >
                            {count}
                        </span>
                    )}
                </span>
            </AppLink>
        </div>
    );
}
