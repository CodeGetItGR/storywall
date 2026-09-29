import { useTranslations } from 'next-intl';

export type DemoUnavailableReason = 'not-found' | 'rate-limited' | 'failed';

const COPY_KEYS = {
    'not-found': { title: 'notFoundTitle', body: 'notFoundBody' },
    'rate-limited': { title: 'rateLimitedTitle', body: 'rateLimitedBody' },
    failed: { title: 'failedTitle', body: 'failedBody' },
} as const;

export function DemoUnavailable({ reason }: { reason: DemoUnavailableReason }) {
    const t = useTranslations('Demo');
    const keys = COPY_KEYS[reason];

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-base font-semibold text-ink">{t(keys.title)}</p>
            <p className="text-sm text-ink-muted">{t(keys.body)}</p>
        </div>
    );
}
