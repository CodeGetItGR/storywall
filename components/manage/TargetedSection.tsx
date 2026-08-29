'use client';

import { Hand } from 'lucide-react';
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
                'relative rounded-2xl outline-none transition-[background-color,box-shadow] duration-300',
                isTargeted && 'target-section-active',
                className
            )}
        >
            {isTargeted && (
                <div
                    className="target-section-cue pointer-events-none absolute -top-9 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[0_12px_28px_rgba(255,122,89,0.35)]"
                    aria-hidden="true"
                >
                    <Hand className="h-5 w-5 rotate-180" strokeWidth={2.4} />
                </div>
            )}
            {children}
        </section>
    );
}
