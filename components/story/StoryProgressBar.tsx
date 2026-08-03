import type { StoryResponseDto } from '@/lib/api/types';

export function StoryProgressBar({ stories, activeIndex, progress }: { stories: StoryResponseDto[]; activeIndex: number; progress: number }) {
    return (
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
            {stories.map((s, i) => (
                <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full transition-none"
                        style={{
                            width: i < activeIndex ? '100%' : i === activeIndex ? `${progress}%` : '0%',
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
