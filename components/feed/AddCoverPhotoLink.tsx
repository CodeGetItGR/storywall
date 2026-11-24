import { ImagePlus } from 'lucide-react';

import { AppLink } from '@/components/ui/AppLink';
import { cn } from '@/lib/utils';

type AddCoverPhotoLinkProps = { href: string; label: string; className?: string };

// A host's shortcut to add a cover, on a feed without one: alone in the cover's corner, or beside the Edit pill.
export function AddCoverPhotoLink({ href, label, className }: AddCoverPhotoLinkProps) {
    return (
        <AppLink
            href={href}
            className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full bg-background/80 px-3 text-xs font-semibold text-ink-muted shadow-[0_10px_24px_rgba(36,31,26,0.12)] backdrop-blur-md transition-colors hover:bg-background hover:text-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                className,
            )}
        >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {label}
        </AppLink>
    );
}
