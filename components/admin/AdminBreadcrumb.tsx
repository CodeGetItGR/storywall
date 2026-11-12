// The desktop top bar: the page's name, then the section open in it.
export function AdminBreadcrumb({ root, current }: { root: string; current?: string }) {
    return (
        <header className="sticky top-0 z-20 hidden items-center gap-2 border-b border-border bg-card/90 px-6 py-2.5 text-[13px] text-ink-faint backdrop-blur lg:flex">
            <span>{root}</span>
            <span aria-hidden="true">›</span>
            <span className="font-bold text-ink">{current}</span>
        </header>
    );
}
