'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

import type { VendorServiceItemDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// One print size: label and price. The whole row opens the edit sheet; the chevron says so.
export function ServiceRow({ size, onEditAction }: { size: VendorServiceItemDto; onEditAction: (item: VendorServiceItemDto) => void }) {
    const locale = useLocale();

    function handleClick() {
        onEditAction(size);
    }

    return (
        <li>
            <button type="button" onClick={handleClick} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-sm">
                <span className="truncate text-ink">{size.label}</span>
                <span className="flex shrink-0 items-center gap-2 text-ink-muted tabular-nums">
                    {formatMoney(locale, size.priceCents, size.currency)}
                    <ChevronRight className="size-4" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}
