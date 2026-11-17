'use client';

import { useEffect, useState } from 'react';

import { FINAL_CTA_SELECTOR, HERO_CREATE_SELECTOR, readHeroCreateHref } from '@/lib/createEventFab';
import { routes } from '@/lib/routes';

type FabTarget = { visible: boolean; href: string };

const HIDDEN: FabTarget = { visible: false, href: routes.events.new() };

// Whether the phone create button should show, and where it goes: after the hero's main button has
// scrolled out of view, and not while the final call to action (which has its own button) is on
// screen. It links where the hero creates, so an occasion page opens on its own type.
export function useCreateEventFabVisible(enabled: boolean): FabTarget {
    const [target, setTarget] = useState<FabTarget>(HIDDEN);

    useEffect(() => {
        if (!enabled) return;
        const heroes = [...document.querySelectorAll(HERO_CREATE_SELECTOR)];
        if (heroes.length === 0) return;
        const finals = [...document.querySelectorAll(FINAL_CTA_SELECTOR)];
        const href = readHeroCreateHref(heroes[0]!);
        const inView = new Map<Element, boolean>();

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
            const heroShowing = heroes.some((element) => inView.get(element) !== false);
            const finalShowing = finals.some((element) => inView.get(element) === true);
            setTarget({ visible: !heroShowing && !finalShowing, href });
        });
        for (const element of [...heroes, ...finals]) observer.observe(element);
        return () => {
            observer.disconnect();
            setTarget(HIDDEN);
        };
    }, [enabled]);

    return enabled ? target : HIDDEN;
}
