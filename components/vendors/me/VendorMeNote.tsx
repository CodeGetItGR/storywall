import type { LucideIcon } from 'lucide-react';

// Where a section stands right now (nothing yet, not open yet, failed), on a soft inset so it reads apart from the
// section's hint.
export function VendorMeNote({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
    return (
        <p className="flex items-start gap-2.5 rounded-xl bg-surface-muted px-3.5 py-3 text-sm leading-snug text-ink">
            <Icon className="mt-px size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            {children}
        </p>
    );
}
