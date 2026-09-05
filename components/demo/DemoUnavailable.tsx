export function DemoUnavailable() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-base font-semibold text-ink">The demo couldn’t start in this browser.</p>
            <p className="text-sm text-ink-muted">Try reloading the page, or use a different browser.</p>
        </div>
    );
}
