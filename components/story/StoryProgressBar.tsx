import type { StoryResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface StoryProgressBarProps {
    stories?: StoryResponseDto[];
    activeIndex?: number;
    progress?: number;
    staticLabel?: string;
    tone?: 'dark' | 'light';
}

export function StoryProgressBar({ stories, activeIndex = 0, progress = 0, staticLabel, tone = 'dark' }: StoryProgressBarProps) {
    if (staticLabel) {
        return (
            <div className="absolute top-3 right-3 left-3 z-30">
                <div className={cn('h-0.5 rounded-full', tone === 'light' ? 'bg-ink/25' : 'bg-white')} aria-label={staticLabel} />
            </div>
        );
    }

    if (!stories) return null;

    return (
        <div className="absolute top-3 right-3 left-3 z-30 flex gap-1">
            {stories.map((s, i) => (
                <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                    <div
                        className="h-full rounded-full bg-white transition-none"
                        style={{
                            width: i < activeIndex ? '100%' : i === activeIndex ? `${progress}%` : '0%',
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
