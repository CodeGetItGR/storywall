import { type KeyboardEvent, type MouseEvent, useState } from 'react';

type PricingCategory = 'vip' | 'wedding';
const CATEGORY_ORDER: PricingCategory[] = ['wedding', 'vip'];

export function useLandingPricingCategory() {
    const [category, setCategory] = useState<PricingCategory>('wedding');
    const selectCategory = (event: MouseEvent<HTMLButtonElement>) => {
        const next = event.currentTarget.dataset.category as PricingCategory | undefined;
        if (next && CATEGORY_ORDER.includes(next)) setCategory(next);
    };
    const handleCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const current = CATEGORY_ORDER.indexOf(category);
        const next =
            event.key === 'ArrowRight'
                ? current + 1
                : event.key === 'ArrowLeft'
                  ? current - 1
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? CATEGORY_ORDER.length - 1
                      : null;
        if (next === null) return;
        event.preventDefault();
        const nextCategory = CATEGORY_ORDER[(next + CATEGORY_ORDER.length) % CATEGORY_ORDER.length];
        setCategory(nextCategory);
        event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-category="${nextCategory}"]`)?.focus();
    };
    return { category, selectCategory, handleCategoryKeyDown };
}
