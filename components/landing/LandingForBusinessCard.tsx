import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { type LandingClick, landingClickAttributes } from '@/lib/landingTracking';
import { cn } from '@/lib/utils';

type LandingForBusinessCardProps = {
    // A sticker in the dark card's corner.
    children?: ReactNode;
    click: LandingClick;
    // The dark card that opens the business page.
    dark?: boolean;
    href: string;
    icon: LucideIcon;
    more: string;
    title: string;
    // The type's tools, drawn as a row of small icons.
    tools?: readonly LucideIcon[];
};

// One vendor type: its icon, name and the icons of its tools, with a link to its page.
export function LandingForBusinessCard({ children, click, dark, href, icon, more, title, tools = [] }: LandingForBusinessCardProps) {
    return (
        <li className="min-w-0">
            <a
                href={href}
                {...landingClickAttributes(click)}
                className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-[24px] p-4 no-underline outline-offset-4 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[#e78274] motion-reduce:transition-none min-[761px]:rounded-[28px] min-[761px]:p-6',
                    dark
                        ? 'bg-[linear-gradient(125deg,#3b2529,#2e2328,#302523,#402a26)] text-white'
                        : 'bg-white text-[#151313] shadow-[0_1px_0_rgba(21,19,19,0.05),0_18px_40px_-28px_rgba(21,19,19,0.45)]',
                )}
            >
                {children}
                {/* Icon */}
                <span
                    className={cn(
                        'relative grid size-14 place-items-center rounded-[18px] min-[761px]:size-16 min-[761px]:rounded-[20px]',
                        dark ? 'bg-white/10' : 'bg-[linear-gradient(135deg,#fbedf1,#fcefea,#fdf1e8,#fef5e9)]',
                    )}
                >
                    <GradientIcon icon={icon} className="size-7 min-[761px]:size-8" />
                </span>
                {/* Name */}
                <span className="relative mt-5 block [font-family:var(--editorial)] text-[22px] leading-[1.02] tracking-[-0.03em] text-balance min-[761px]:mt-6 min-[761px]:text-[27px]">
                    {title}
                </span>
                {/* Tools */}
                {tools.length > 0 && (
                    <span aria-hidden="true" className="relative mt-4 flex gap-1 min-[761px]:gap-1.5">
                        {tools.map((tool, index) => (
                            <span key={index} className="grid size-7 place-items-center rounded-full bg-[#f4f0e8] min-[761px]:size-8">
                                <GradientIcon icon={tool} className="size-4" />
                            </span>
                        ))}
                    </span>
                )}
                {/* More */}
                <span
                    className={cn(
                        'relative mt-auto inline-flex items-center gap-1 self-end pt-5 text-sm font-semibold underline decoration-1 underline-offset-4',
                        dark ? 'text-white' : 'text-[#151313]',
                    )}
                >
                    {more}
                    <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                </span>
            </a>
        </li>
    );
}
