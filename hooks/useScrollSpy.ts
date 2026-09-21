'use client';

import { useEffect, useState } from 'react';

function isScrollContainer(element: HTMLElement) {
    const overflowY = getComputedStyle(element).overflowY;
    return overflowY === 'auto' || overflowY === 'scroll';
}

// Reports which of the given section ids is nearest the top of its scroll
// container. The container is found by walking up from the first section.
export function useScrollSpy(sectionIds: string[]) {
    const [active, setActive] = useState(sectionIds[0] ?? '');

    useEffect(() => {
        const first = sectionIds[0] ? document.getElementById(sectionIds[0]) : null;
        if (!first) return;
        let container: HTMLElement | null = first.parentElement;
        while (container && !isScrollContainer(container)) container = container.parentElement;
        if (!container) return;

        const target = container;
        function update() {
            const top = target.getBoundingClientRect().top + 80;
            let current = sectionIds[0] ?? '';
            for (const id of sectionIds) {
                const element = document.getElementById(id);
                if (element && element.getBoundingClientRect().top <= top) current = id;
            }
            setActive(current);
        }

        update();
        target.addEventListener('scroll', update, { passive: true });
        return () => target.removeEventListener('scroll', update);
    }, [sectionIds]);

    return active;
}
