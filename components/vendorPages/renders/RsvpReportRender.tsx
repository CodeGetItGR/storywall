import { Download, Printer } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { VENDOR_RENDER_DATE } from '@/components/vendorPages/renders/renderSample';
import { RSVP_REPORT_LABELS } from '@/lib/demo/rsvpReport';
import { formatReportDate } from '@/lib/rsvpReport';

const GUEST_COUNTS = [
    { adults: 3, children: 1 },
    { adults: 3, children: 2 },
    { adults: 2, children: 0 },
];

// The full-list RSVP report screen as a phone shows it, with sample replies. Same look as RsvpReportScreen, without its page headings: this page keeps its own.
export async function RsvpReportRender() {
    const locale = await getLocale();
    const tOccasion = await getTranslations('OccasionPages.WEDDING');
    const tStats = await getTranslations('ManagePage.rsvpStats');
    const tReports = await getTranslations('ManagePage.rsvpReports');
    const tReport = await getTranslations('ManagePage.rsvpReport');
    const t = await getTranslations('VendorPages.renders.rsvp');
    const labels = locale.startsWith('el') ? RSVP_REPORT_LABELS.el : RSVP_REPORT_LABELS.en;
    const guests = (t.raw('guests') as string[]).map((name, index) => ({ name, ...GUEST_COUNTS[index] }));
    const categoryLabel = 'mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase';

    return (
        <div className="flex min-h-full flex-col gap-5 bg-background p-4">
            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="lg">
                    <Printer />
                    {tReport('print')}
                </Button>
                <Button variant="outline" size="lg">
                    <Download />
                    {tReport('downloadPdf')}
                </Button>
            </div>

            {/* Header */}
            <div>
                <p className="m-0 text-2xl font-extrabold break-words text-ink">{t('couple')}</p>
                <p className="m-0 mt-1 text-sm text-ink-muted">{`${tOccasion('name')} · ${formatReportDate(locale, VENDOR_RENDER_DATE)}`}</p>
                <p className="m-0 mt-0.5 text-xs text-ink-faint">{tReports('types.FULL_LIST.label')}</p>
            </div>

            {/* Tiles */}
            <MetricStrip
                className="sm:grid-cols-2"
                wrapLabels
                items={[
                    { key: 'responses', label: tStats('responses'), value: 25 },
                    { key: 'people', label: tStats('totalPeople'), value: 64 },
                    { key: 'adults', label: tStats('adults'), value: 47 },
                    { key: 'kids', label: tStats('kids'), value: 17 },
                ]}
            />

            {/* Categories */}
            <div>
                <p className={`m-0 ${categoryLabel}`}>{tStats('byCategory')}</p>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 text-ink-muted">{labels.attending}</span>
                    <span className="shrink-0 font-bold text-ink tabular-nums">
                        {tReport('people', { count: 64 })} <span className="font-normal text-ink-faint">100%</span>
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full w-full rounded-full bg-primary" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 text-ink-muted">{labels.declined}</span>
                    <span className="shrink-0 font-bold text-ink tabular-nums">{tReport('responses', { count: 4 })}</span>
                </div>
            </div>

            {/* Guest list */}
            <div>
                <p className={`m-0 ${categoryLabel}`}>{tReport('guestList')}</p>
                <p className="m-0 mb-2 text-sm font-bold text-primary">
                    {`${labels.attending} · ${tReport('responses', { count: 21 })} / ${tReport('people', { count: 64 })}`}
                </p>

                {/* Rows */}
                <ul className="m-0 list-none divide-y divide-border border-t border-border p-0">
                    {guests.map(({ name, adults, children }) => (
                        <li key={name} className="py-2.5 text-sm">
                            <p className="m-0 font-semibold text-ink">{name}</p>
                            <p className="m-0 text-xs text-ink-muted">{`${tReport('columns.adults')} ${adults} · ${tReport('columns.children')} ${children}`}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
