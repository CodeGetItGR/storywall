import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

// An icon mask filled with the brand gradient, as on the design's private and feature cards.
export function GradientIcon({ className, src }: { className?: string; src: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'block shrink-0 bg-[linear-gradient(135deg,#f89ab0_0%,#f6a18f_34%,#f4b37b_68%,#f3cf8a_100%)] [mask-image:var(--icon)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-image:var(--icon)] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]',
                className,
            )}
            style={{ '--icon': `url('${src}')` } as CSSProperties}
        />
    );
}
