import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type OccasionCtaLinkProps = { children: ReactNode; className?: string; href: string; size?: 'md' | 'sm' };

// The occasion pages' primary action: a pill in the brand gradient.
export function OccasionCtaLink({ children, className, href, size = 'md' }: OccasionCtaLinkProps) {
    return (
        <a
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--occasion-gradient)] font-bold text-white no-underline shadow-[0_10px_24px_-12px_rgba(212,58,98,0.7)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d43a62]',
                size === 'md' ? 'min-h-13 px-7 text-[15px]' : 'min-h-10 px-4 text-[13px]',
                className,
            )}
            href={href}
        >
            {children}
            {size === 'md' ? <ArrowRight aria-hidden="true" className="size-4 shrink-0" /> : null}
        </a>
    );
}
