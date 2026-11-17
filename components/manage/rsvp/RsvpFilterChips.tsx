'use client';

import { useTranslations } from 'next-intl';

import type { RosterFilter } from '@/hooks/useRsvpRoster';
import type { RsvpDisplayStatus } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const filters: { key: RosterFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'rsvpFilters.all' },
    { key: 'ATTENDING', labelKey: 'rsvpBreakdown.attending' },
    { key: 'DECLINED', labelKey: 'rsvpBreakdown.declined' },
    { key: 'NO_RESPONSE', labelKey: 'rsvpBreakdown.noResponse' },
];

type RsvpFilterChipsProps = {
    filter: RosterFilter;
    counts: Record<RsvpDisplayStatus, number>;
    guestCount: number;
    onChangeAction: (filter: RosterFilter) => void;
};

// R1a: the guest list's filters as chips with counts (was a select).
export function RsvpFilterChips({ filter, counts, guestCount, onChangeAction }: RsvpFilterChipsProps) {
    const t = useTranslations('ManagePage');

    return (
        <div role="group" aria-label={t('rsvpGuests.title')} className="flex flex-wrap gap-2">
            {filters.map(({ key, labelKey }) => (
                <FilterChip
                    key={key}
                    filterKey={key}
                    label={t(labelKey)}
                    count={key === 'all' ? guestCount : counts[key]}
                    active={key === filter}
                    onSelectAction={onChangeAction}
                />
            ))}
        </div>
    );
}

type FilterChipProps = {
    filterKey: RosterFilter;
    label: string;
    count: number;
    active: boolean;
    onSelectAction: (filter: RosterFilter) => void;
};

function FilterChip({ filterKey, label, count, active, onSelectAction }: FilterChipProps) {
    function handleClick() {
        onSelectAction(filterKey);
    }

    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={handleClick}
            className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                active ? 'bg-ink text-white' : 'bg-background text-ink-muted ring-1 ring-border ring-inset hover:text-ink',
            )}
        >
            {/* The space keeps the name "All 110" for screen readers; flex drops it visually. */}
            {label}{' '}
            <span className="opacity-70">{count}</span>
        </button>
    );
}
