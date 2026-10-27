import { Store } from 'lucide-react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

// The vendor's logo, or a plain icon tile when there is none.
export function VendorLogo({ logoUrl, name, className }: { logoUrl: string | null; name: string; className?: string }) {
    return (
        <span className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted', className)}>
            {logoUrl ? (
                <ProtectedImage src={logoUrl} alt={name} fill sizes="48px" className="object-contain" />
            ) : (
                <Store className="size-5 text-ink-muted" aria-hidden="true" />
            )}
        </span>
    );
}
