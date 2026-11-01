import type { LucideIcon } from 'lucide-react';

// A section with nothing to show yet: a small icon, a short title and one line, centered in the section's surface.
export function BusinessEmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            {/* Icon */}
            <span className="flex size-11 items-center justify-center rounded-full bg-canvas text-ink-muted">
                <Icon className="size-5" aria-hidden="true" />
            </span>

            {/* Message */}
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="max-w-xs text-sm text-ink-muted">{body}</p>
        </div>
    );
}
