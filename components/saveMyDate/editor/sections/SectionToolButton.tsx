import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type SectionToolButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'children'> & {
    label: string;
    // A section that is hidden from guests shows its eye in red.
    isOff?: boolean;
    // Left out when a Base UI trigger renders the button and passes its own.
    children?: ReactNode;
};

// A round white button on a section, like the old editor's, big enough for a thumb.
export const SectionToolButton = forwardRef<HTMLButtonElement, SectionToolButtonProps>(function SectionToolButton(
    { label, isOff = false, className, children, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            title={label}
            className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#2b2d31] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-colors',
                'hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-(--smd-editor-accent) focus-visible:outline-none [&_svg]:h-4.5 [&_svg]:w-4.5',
                isOff && 'text-[#b3462f]',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
});
