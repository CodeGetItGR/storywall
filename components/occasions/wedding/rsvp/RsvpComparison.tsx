import type { ReactNode } from 'react';

type RsvpComparisonProps = {
    // With StoryWall.
    after: ReactNode;
    // Without StoryWall.
    before: ReactNode;
    // What the picture shows, for assistive tech.
    label: string;
};

// Without and with StoryWall as one picture. From 761 px they sit side by side with a curved arrow
// between them; below, stacked.
export function RsvpComparison({ after, before, label }: RsvpComparisonProps) {
    return (
        <div aria-label={label} className="relative grid gap-6.5 min-[761px]:grid-cols-[38fr_62fr]" role="img">
            {before}
            <svg className="absolute top-[7%] left-[37%] hidden w-[11.5%] min-[761px]:block" fill="none" viewBox="0 0 120 90">
                <path d="M6 86C12 44 52 12 108 11" stroke="#d0623a" strokeLinecap="round" strokeWidth={2.4} />
                <path d="M98 3l11 8-10 9" stroke="#d0623a" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
            </svg>
            {after}
        </div>
    );
}
