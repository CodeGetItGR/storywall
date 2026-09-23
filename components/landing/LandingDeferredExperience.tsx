'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const LandingExperienceStack = dynamic(() => import('@/components/landing/LandingExperienceStack').then((module) => module.LandingExperienceStack));

export function LandingDeferredExperience() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section || !('IntersectionObserver' in window)) {
            setShouldRender(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                setShouldRender(true);
                observer.disconnect();
            },
            { rootMargin: '1200px 0px' },
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-px" ref={sectionRef}>
            {shouldRender ? <LandingExperienceStack /> : null}
        </div>
    );
}
