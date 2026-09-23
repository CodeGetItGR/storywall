import { ChevronRight, MailCheck, MailQuestionMark, MailX } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { EventRsvpSummaryDto } from '@/lib/api/types';
import { formatCount } from '@/lib/format';
import { routes } from '@/lib/routes';

type RsvpSummarySectionProps = {
    eventId: string;
    summary: EventRsvpSummaryDto;
};

export function RsvpSummarySection({ eventId, summary }: RsvpSummarySectionProps) {
    const t = useTranslations('RightContextPanel.rsvpSummary');

    const rows = [
        { key: 'attending', value: summary.attending, icon: MailCheck },
        { key: 'declined', value: summary.declined, icon: MailX },
        { key: 'noResponse', value: summary.noResponse, icon: MailQuestionMark },
    ] as const;

    return (
        <div>
            <Link
                href={routes.events.tools.rsvp(eventId)}
                className="group mb-2 flex items-center gap-1 text-sm font-semibold text-ink hover:text-ink-muted"
            >
                {t('title')}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
            </Link>
            <div className="flex justify-between rounded-xl bg-surface-muted/70 px-3 py-2.5">
                {rows.map(({ key, value, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-ink-muted">
                            <Icon />
                        </span>
                        <span className="font-medium text-ink">{formatCount(value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
