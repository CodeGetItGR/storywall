import Image from 'next/image';

import type { JourneyTotal } from '@/hooks/useDayJourney';
import { formatCount } from '@/lib/format';
import { journeyIcons } from '@/lib/journeyIcons';

function TotalIcon({ total }: { total: JourneyTotal }) {
    const icon = journeyIcons[total.icon];
    if (icon.kind === 'image')
        return <Image src={icon.src} alt={total.label} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />;
    return <icon.icon className="h-6 w-6" role="img" aria-label={total.label} />;
}

/** On the day: what guests have shared so far. */
export function JourneyTotals({ totals }: { totals: JourneyTotal[] }) {
    if (totals.length === 0) return null;
    return (
        <dl className="grid grid-cols-2 gap-3">
            {totals.map((total) => (
                <div key={total.key} className="flex items-center gap-3 rounded-2xl bg-primary-light/40 px-4 py-3">
                    {/* Icon */}
                    <TotalIcon total={total} />
                    {/* Label and value: dt first for valid markup; the number shows on top */}
                    <div className="flex flex-col-reverse">
                        <dt className="text-sm text-ink-muted">{total.label}</dt>
                        <dd className="text-xl leading-none font-bold text-ink">{formatCount(total.value)}</dd>
                    </div>
                </div>
            ))}
        </dl>
    );
}
