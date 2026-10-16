'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { REVIEW_STAR_VALUES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

// Native radios (visually hidden) keep arrow-key and screen-reader support.
export function ReviewStars({ value, onChangeAction }: { value: number | null; onChangeAction: (stars: number) => void }) {
    const t = useTranslations('ReviewPrompt');

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChangeAction(Number(event.target.value));
    }

    return (
        <fieldset className="flex gap-1">
            <legend className="sr-only">{t('rating')}</legend>
            {REVIEW_STAR_VALUES.map((count) => (
                <label key={count} className="cursor-pointer rounded-full p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
                    <input
                        type="radio"
                        name="review-stars"
                        value={count}
                        checked={value === count}
                        onChange={handleChange}
                        aria-label={t('star', { count })}
                        className="sr-only"
                    />
                    <Star
                        aria-hidden
                        className={cn('h-9 w-9 transition-colors', value !== null && count <= value ? 'fill-primary text-primary' : 'text-ink-muted')}
                    />
                </label>
            ))}
        </fieldset>
    );
}
