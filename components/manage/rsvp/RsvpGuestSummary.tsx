'use client';

import type { ReactNode } from 'react';

import type { RsvpListRow } from '@/hooks/useRsvpListRows';

type RsvpGuestSummaryProps = {
    row: RsvpListRow;
    // Shown under the name on small screens only (the table has its own column).
    details?: ReactNode;
    // The possible-duplicate mark, when the reply has one.
    mark?: ReactNode;
};

// The guest's name, how to reach a reply-only guest, and any mark on their reply.
export function RsvpGuestSummary({ row, details, mark }: RsvpGuestSummaryProps) {
    return (
        <div className="min-w-0">
            {/* Name */}
            <p className="truncate text-sm leading-tight font-semibold text-ink">{row.name}</p>
            {/* Contact */}
            {row.contact && <p className="mt-0.5 truncate text-xs text-ink-faint">{row.contact}</p>}
            {details}
            {/* Duplicate */}
            {mark}
        </div>
    );
}
