import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const GRADIENT_ID = 'vendor-page-gradient';

// The brand gradient as an SVG paint, rendered once per page so every GradientIcon can stroke with it.
export function GradientIconDefs() {
    return (
        <svg aria-hidden="true" className="absolute size-0" focusable="false">
            <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id={GRADIENT_ID} x1="0" x2="24" y1="0" y2="24">
                    <stop offset="0" stopColor="#d27b9b" />
                    <stop offset="0.5" stopColor="#f4905f" />
                    <stop offset="1" stopColor="#fcba63" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export function GradientIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
    return <Icon aria-hidden="true" className={cn('size-7 shrink-0', className)} stroke={`url(#${GRADIENT_ID})`} strokeWidth={1.5} />;
}
