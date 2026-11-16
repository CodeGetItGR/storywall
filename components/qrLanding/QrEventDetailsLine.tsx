import { CalendarDays, MapPin } from 'lucide-react';

import type { QrEventDetails } from '@/lib/qrLanding';

// When and where, on one short line under the event's name on the QR choice page.
export function QrEventDetailsLine({ details }: { details: QrEventDetails }) {
    return (
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[13px] text-ink-muted">
            {/* When */}
            {details.when ? (
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {details.when}
                </span>
            ) : null}
            {/* Where */}
            {details.where ? (
                <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {details.where}
                </span>
            ) : null}
        </p>
    );
}
