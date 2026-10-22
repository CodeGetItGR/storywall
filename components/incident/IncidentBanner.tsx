import { TriangleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// Shown on every page while lib/incident.ts has the incident switch on. Not dismissible.
export async function IncidentBanner() {
    const t = await getTranslations('Incident');

    return (
        <div
            role="status"
            className="flex shrink-0 items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
            <TriangleAlert aria-hidden className="h-4 w-4 shrink-0" />
            <p>{t('banner')}</p>
        </div>
    );
}
