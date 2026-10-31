// Faded rows shaped like the host's picks, so an empty print order shows what will land here.
const BAR_WIDTHS = ['w-24', 'w-32', 'w-20'];

export function PrintsGhostRows() {
    return (
        <ul aria-hidden="true" className="divide-y divide-border opacity-80">
            {BAR_WIDTHS.map((width) => (
                <li key={width} className="flex items-center gap-3 py-2">
                    <span className="size-12 shrink-0 rounded-lg bg-ink/[0.06]" />
                    <span className={`h-3 rounded-full bg-ink/[0.06] ${width}`} />
                    <span className="h-3 w-10 rounded-full bg-ink/[0.06]" />
                </li>
            ))}
        </ul>
    );
}
