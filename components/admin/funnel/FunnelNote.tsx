import { Info } from 'lucide-react';

export function FunnelNote({ children }: { children: string }) {
    return (
        <p className="mt-4 flex items-start gap-1.5 text-xs leading-5 text-ink-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}
