import type { ReactNode } from 'react';

// One area of the vendor page (the work for this event, or the vendor's settings): a heading over its sections.
export function VendorMeGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section aria-labelledby={id} className="flex flex-col gap-6">
            {/* Title */}
            <h2 id={id} className="text-lg font-bold text-ink">
                {title}
            </h2>

            {/* Sections */}
            <div className="flex flex-col gap-8">{children}</div>
        </section>
    );
}
