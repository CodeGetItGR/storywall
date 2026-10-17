'use client';

import { lazy, Suspense, useRef } from 'react';

import { RenderedSignal } from '@/components/common/RenderedSignal';
import type { LandingSocialCopy } from '@/components/landing/LandingExperienceStack';
import { useLandingDeferredRender } from '@/hooks/useLandingDeferredRender';

const LandingExperienceStack = lazy(() =>
    import('@/components/landing/LandingExperienceStack').then((module) => ({ default: module.LandingExperienceStack })),
);

export function LandingDeferredExperience({ social }: { social?: LandingSocialCopy }) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { shouldRender, onRendered } = useLandingDeferredRender(sectionRef);

    return (
        <div className="min-h-px" ref={sectionRef}>
            {shouldRender ? (
                <Suspense fallback={null}>
                    <LandingExperienceStack social={social} />
                    <RenderedSignal onRendered={onRendered} />
                </Suspense>
            ) : null}
        </div>
    );
}
