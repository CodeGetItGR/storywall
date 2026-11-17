import { AppLink } from '@/components/ui/AppLink';
import type { JourneyChip, JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

const CHIP_TONES: Record<JourneyChip['tone'], string> = {
    success: 'bg-emerald-50 text-emerald-800',
    neutral: 'bg-surface-muted text-ink-muted',
    warn: 'bg-amber-50 text-amber-800',
};

/** A stop's chips and text links, under its line on the path or in its small-screen card. */
export function JourneyStopExtras({ stop, align = 'start' }: { stop: JourneyStopModel; align?: 'start' | 'end' | 'center' }) {
    return (
        <>
            {/* Chips */}
            {stop.chips && stop.chips.length > 0 && (
                <span className={cn('flex flex-wrap gap-1.5', align === 'end' && 'justify-end', align === 'center' && 'justify-center')}>
                    {stop.chips.map((chip) => (
                        <span key={chip.key} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', CHIP_TONES[chip.tone])}>
                            {chip.label}
                        </span>
                    ))}
                </span>
            )}
            {/* Links */}
            {stop.links?.map((link) => (
                <AppLink key={link.key} href={link.href} className="text-sm font-semibold text-primary-dark hover:underline">
                    {link.label}
                </AppLink>
            ))}
        </>
    );
}
