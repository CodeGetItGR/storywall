import type { InvitationLabels } from '@/lib/invitation/labels';

const INK = { fill: 'var(--site-text)' };
const TASSEL = { fill: 'var(--primary)' };

// A mortarboard with a hanging tassel: the board in the theme's text colour, the tassel in its
// primary colour.
export function GraduationCap({ labels, className = '' }: { labels: InvitationLabels; className?: string }) {
    return (
        <svg viewBox="0 0 120 92" role="img" aria-label={labels.graduationCap} className={['grad-cap', className].filter(Boolean).join(' ')}>
            <path d="M30 40 v24 c0 12 60 12 60 0 v-24 z" style={INK} />
            <path d="M30 52 c0 9 60 9 60 0" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={3} />
            <polygon points="60,6 116,30 60,54 4,30" style={INK} />
            <polygon points="60,6 116,30 60,30" fill="#fff" fillOpacity={0.1} />
            <polygon points="60,54 116,30 116,33 60,57 4,33 4,30" fill="#000" fillOpacity={0.3} />
            <circle cx="60" cy="30" r="3.4" style={TASSEL} />
            <path d="M60 30 C80 34 92 36 100 40 L100 70" fill="none" strokeWidth={2.6} style={{ stroke: 'var(--primary)' }} />
            <path d="M96 70 h8 l2 16 h-12 z" style={TASSEL} />
        </svg>
    );
}
