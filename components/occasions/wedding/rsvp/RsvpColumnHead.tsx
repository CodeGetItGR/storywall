import { cn } from '@/lib/utils';

const PILL = {
    // Grey: the scattered replies.
    muted: 'bg-[linear-gradient(180deg,#eef0f2,#dfe2e6)] text-[#3d4148] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0.3em_0.8em_-0.4em_rgba(0,0,0,0.25)]',
    // Coral: StoryWall.
    brand: 'bg-[#fde3d9] text-[#e8604a]',
} as const;

type RsvpColumnHeadProps = {
    caption: string;
    // The head's font size; the pill and caption are sized from it.
    className: string;
    pill: string;
    tone: keyof typeof PILL;
};

// A column's pill and one-line caption.
export function RsvpColumnHead({ caption, className, pill, tone }: RsvpColumnHeadProps) {
    return (
        <div className={cn('flex flex-col items-center text-center', className)}>
            <span className={cn('inline-flex h-[2.5em] items-center rounded-full px-[1.5em] leading-none font-bold tracking-[0.12em]', PILL[tone])}>
                {pill}
            </span>
            <span className={cn('mt-[0.6em] text-[0.8em] leading-[1.3]', tone === 'muted' ? 'text-[#3d4148]' : 'text-[#6f6a64]')}>{caption}</span>
        </div>
    );
}
