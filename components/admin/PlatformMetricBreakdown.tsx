import { AdminSection } from '@/components/admin/AdminSection';
import { formatCount } from '@/lib/format';

export function PlatformMetricBreakdown({ title, values }: { title: string; values: Record<string, number> }) {
    const entries = Object.entries(values).sort(([left], [right]) => left.localeCompare(right));

    return (
        <AdminSection title={title} className="border-0 pt-0">
            {entries.length === 0 ? (
                <p className="text-sm text-ink-muted">0</p>
            ) : (
                <dl className="divide-y divide-border">
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-4 py-2">
                            <dt className="min-w-0 truncate text-sm font-semibold text-ink">{key}</dt>
                            <dd className="text-sm font-bold tabular-nums text-ink-muted">{formatCount(value)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </AdminSection>
    );
}
