'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

type ThemeCatalogueSearchProps = { query: string; onQueryChange: (query: string) => void };

// Filters the cards by name as the visitor types.
export function ThemeCatalogueSearch({ query, onQueryChange }: ThemeCatalogueSearchProps) {
    const t = useTranslations('SaveMyDateStorefront.catalogue');

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onQueryChange(event.target.value);
    }

    return (
        <div className="relative w-full min-[761px]:max-w-90" role="search">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#151313]/50" />
            <input
                aria-label={t('searchLabel')}
                className="h-12 w-full rounded-full border border-[#151313]/15 bg-white pr-4 pl-11 text-base text-[#151313] placeholder:text-[#151313]/45 focus-ring"
                placeholder={t('searchPlaceholder')}
                type="search"
                value={query}
                onChange={handleChange}
            />
        </div>
    );
}
