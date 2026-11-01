import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { cn } from '@/lib/utils';

// Phones scroll the cards sideways with the next one peeking in; desktop lays them out in a grid.
export const CARD_SIZE = 'w-[72%] shrink-0 snap-start min-[480px]:w-[46%] min-[761px]:w-[34%] min-[1000px]:w-auto';

type LandingForBusinessCardProps = {
    body: string;
    // The photo or illustration behind the text.
    children: ReactNode;
    className?: string;
    href: string;
    icon: LucideIcon;
    title: string;
};

// One vendor type: a tall photo with its icon, name and what they get.
export function LandingForBusinessCard({ body, children, className, href, icon, title }: LandingForBusinessCardProps) {
    return (
        <li className={CARD_SIZE}>
            <a
                href={href}
                className={cn(
                    'group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[26px] p-5 text-white no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#e78274] min-[761px]:rounded-[30px]',
                    className,
                )}
            >
                {children}
                {/* Icon */}
                <span className="relative grid size-11 place-items-center rounded-full bg-white/95 shadow-[0_8px_20px_-10px_rgba(21,19,19,0.6)]">
                    <GradientIcon icon={icon} className="size-5" />
                </span>
                {/* Name and what they get */}
                <span className="relative">
                    <span className="block [font-family:var(--editorial)] text-[27px] leading-[1.02] tracking-[-0.03em] text-balance min-[1000px]:text-[clamp(24px,2.1vw,30px)]">
                        {title}
                    </span>
                    <span className="mt-2 block text-sm leading-[1.45] text-white/80">{body}</span>
                </span>
            </a>
        </li>
    );
}
