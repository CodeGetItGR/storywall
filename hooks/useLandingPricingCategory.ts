import { useState } from 'react';

export function useLandingPricingCategory() {
    const [category, setCategory] = useState<'wedding' | 'vip'>('wedding');
    return { category, setCategory };
}
