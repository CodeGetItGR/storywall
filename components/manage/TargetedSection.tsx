'use client';

import type { ReactNode } from 'react';

import { useTargetedSection } from '@/hooks/useTargetedSection';
import { cn } from '@/lib/utils';

export function TargetedSection({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
    const { sectionRef, isTargeted } = useTargetedSection(id);

    return (
        <section
            ref={sectionRef}
            id={id}
            tabIndex={-1}
            className={cn(
                'rounded-2xl outline-none transition-[background-color,box-shadow] duration-300',
                isTargeted && 'target-section-active',
                className
            )}
        >
            {children}
        </section>
    );
}
