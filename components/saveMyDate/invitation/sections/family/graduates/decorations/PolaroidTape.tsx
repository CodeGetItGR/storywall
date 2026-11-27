import type { InvitationLabels } from '@/lib/invitation/labels';

// The strip of tape holding a polaroid, in a see-through tint of the theme's primary colour.
export function PolaroidTape({ labels }: { labels: InvitationLabels }) {
    return (
        <svg viewBox="0 0 92 26" role="img" aria-label={labels.tape} className="grad-tape">
            <rect width="92" height="26" style={{ fill: 'color-mix(in srgb, var(--primary) 35%, rgb(255 255 255 / 0.55))' }} />
        </svg>
    );
}
