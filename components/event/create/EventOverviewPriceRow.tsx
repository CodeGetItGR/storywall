export function EventOverviewPriceRow({
    label,
    detail,
    amount,
    fallback,
}: {
    label: string;
    detail: string;
    amount: string | null;
    fallback: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 text-sm">
            <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
            </div>
            <span className="shrink-0 font-semibold text-ink">{amount ?? fallback}</span>
        </div>
    );
}
