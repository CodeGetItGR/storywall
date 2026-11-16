import { JourneyStopIcon } from '@/components/manage/overview/JourneyStopIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { JourneyChip, JourneyStopModel } from '@/lib/eventJourney';
import { cn } from '@/lib/utils';

const CHIP_TONES: Record<JourneyChip['tone'], string> = {
    success: 'bg-emerald-50 text-emerald-800',
    neutral: 'bg-surface-muted text-ink-muted',
    warn: 'bg-amber-50 text-amber-800',
};

/** One stop: its circle, title, line, chips and links. `align` puts the text on the circle's left or right. */
export function JourneyStop({ stop, align }: { stop: JourneyStopModel; align: 'start' | 'end' | 'center' }) {
    return (
        <div
            className={cn('flex items-center gap-3', align === 'end' && 'flex-row-reverse text-right', align === 'center' && 'flex-col text-center')}
        >
            {/* Circle */}
            <JourneyStopIcon stop={stop} />

            {/* Text */}
            <div className={cn('flex min-w-0 flex-col gap-1', align === 'end' && 'items-end', align === 'center' && 'items-center')}>
                <AppLink href={stop.href} className="text-[15px] leading-tight font-bold text-ink hover:underline">
                    {stop.title}
                </AppLink>
                {stop.highlight && <span className="text-sm font-semibold text-primary-dark">{stop.highlight}</span>}
                {stop.detail && <span className="text-sm text-ink-muted">{stop.detail}</span>}
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
            </div>
        </div>
    );
}
