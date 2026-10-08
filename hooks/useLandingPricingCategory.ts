import { type KeyboardEvent, type MouseEvent, useState } from 'react';

// Which landing pricing tab is open. Starts on defaultId; if the open tab is no longer among ids
// (config changed), the default — or else the first — tab is shown instead.
export function useLandingPricingCategory(ids: readonly string[], defaultId: string | null) {
    const [picked, setPicked] = useState<string | null>(null);
    const category = picked !== null && ids.includes(picked) ? picked : defaultId !== null && ids.includes(defaultId) ? defaultId : (ids[0] ?? null);

    const selectCategory = (event: MouseEvent<HTMLButtonElement>) => {
        const next = event.currentTarget.dataset.category;
        if (next && ids.includes(next)) setPicked(next);
    };
    const handleCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (category === null) return;
        const current = ids.indexOf(category);
        const next =
            event.key === 'ArrowRight'
                ? current + 1
                : event.key === 'ArrowLeft'
                  ? current - 1
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? ids.length - 1
                      : null;
        if (next === null) return;
        event.preventDefault();
        const nextCategory = ids[(next + ids.length) % ids.length];
        setPicked(nextCategory);
        event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-category="${nextCategory}"]`)?.focus();
    };
    return { category, selectCategory, handleCategoryKeyDown };
}
