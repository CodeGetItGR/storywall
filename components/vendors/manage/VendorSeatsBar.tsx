// V1: the vendor seats as a thin bar with "4 / 5" beside it, read out as one phrase.
export function VendorSeatsBar({ label, spoken, percent }: { label: string; spoken: string; percent: number }) {
    return (
        <span role="img" aria-label={spoken} className="flex items-center gap-2 text-[13px] text-ink-muted tabular-nums">
            {/* Bar */}
            <span aria-hidden="true" className="block h-1 w-14 overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${percent}%` }} />
            </span>

            {/* Count */}
            <span aria-hidden="true" className="whitespace-nowrap">
                {label}
            </span>
        </span>
    );
}
