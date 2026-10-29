import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

// Tells a visitor on a demo guest page (upload, invitation) what is different from the real one.
export function DemoGuestNotice({ children }: { children: ReactNode }) {
    return (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {children}
        </p>
    );
}
