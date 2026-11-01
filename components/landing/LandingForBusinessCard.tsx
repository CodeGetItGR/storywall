import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { cn } from '@/lib/utils';

type LandingForBusinessCardProps = {
    body: string;
    // A sticker in the dark card's corner.
    children?: ReactNode;
    // The dark card that opens the business page.
    dark?: boolean;
    href: string;
    icon: LucideIcon;
    title: string;
    // The type's tools, drawn as a row of small icons.
    tools?: readonly LucideIcon[];
};

// One vendor type: its icon, name, what it gets and the icons of its tools.
export function LandingForBusinessCard({ body, children, dark, href, icon, title, tools = [] }: LandingForBusinessCardProps) {
    return (
        <li className="min-w-0">
            <a
                href={href}
                className={cn(
                    'relative flex h-full flex-col overflow-hidden rounded-[24px] p-4 no-underline outline-offset-4 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[#e78274] motion-reduce:transition-none min-[761px]:rounded-[28px] min-[761px]:p-6',
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
                {/* Name and what they get */}
                <span className="relative mt-5 block [font-family:var(--editorial)] text-[22px] leading-[1.02] tracking-[-0.03em] text-balance min-[761px]:mt-6 min-[761px]:text-[27px]">
                    {title}
                </span>
                <span className={cn('relative mt-2 block text-[13px] leading-[1.45] min-[761px]:text-sm', dark ? 'text-white/75' : 'text-[#151313]/70')}>
                    {body}
                </span>
                {/* Tools */}
                {tools.length > 0 && (
                    <span aria-hidden="true" className="relative mt-auto flex gap-1 pt-5 min-[761px]:gap-1.5">
                        {tools.map((tool, index) => (
                            <span key={index} className="grid size-7 place-items-center rounded-full bg-[#f4f0e8] min-[761px]:size-8">
                                <GradientIcon icon={tool} className="size-4" />
                            </span>
                        ))}
                    </span>
                )}
            </a>
        </li>
    );
}
