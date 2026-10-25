import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import { cn } from '@/lib/utils';

// The small caps label at the top of the Without and With cards; each card adds its color.
export const WHY_LABEL_CLASS = 'mt-0 mb-1.5 text-[11px] font-extrabold tracking-[0.16em] uppercase';

// Where each of the three photos lands on the card, and its tilt.
const SCATTER = ['top-7.5 left-[3%] -rotate-9', 'top-0 left-[35%] rotate-6', 'top-10 left-[66%] -rotate-4'] as const;

const BUBBLE =
    'absolute m-0 bg-white px-3.5 py-2.5 text-[12px] font-semibold whitespace-nowrap shadow-[0_10px_24px_-12px_rgba(0,0,0,0.3)] min-[861px]:text-[13px]';

type WhyWithoutProps = {
    bubbles: [string, string];
    items: string[];
    label: string;
    photos: readonly OccasionPhoto[];
};

// "Without StoryWall": three grey photos with two chat bubbles, then what goes wrong.
export function WhyWithout({ bubbles, items, label, photos }: WhyWithoutProps) {
    return (
        <div className="rounded-[30px] bg-[#f2f1ef] px-5 py-6 min-[861px]:px-8.5 min-[861px]:py-7">
            <p className={cn(WHY_LABEL_CLASS, 'text-[#8a857f]')}>{label}</p>
            <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-2.5 min-[861px]:grid-cols-[1.1fr_0.9fr] min-[861px]:gap-7.5">
                {/* Photos and bubbles */}
                <div aria-hidden="true" className="relative h-55 min-[861px]:h-62.5">
                    {photos.map((photo, index) => (
                        <MockPhoto
                            className={cn(
                                'absolute h-40 w-[31%] rounded-[14px] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.4)] brightness-95 grayscale-60 min-[861px]:h-47.5',
                                SCATTER[index],
                            )}
                            key={photo.src}
                            photo={photo}
                            sizes="(min-width: 861px) 360px, 31vw"
                        />
                    ))}
                    <p className={cn(BUBBLE, 'top-42 left-[4%] rounded-[18px_18px_18px_4px] min-[861px]:top-43 min-[861px]:left-[18%]')}>
                        {bubbles[0]}
                    </p>
                    <p className={cn(BUBBLE, 'top-1.5 right-[2%] rounded-[18px_18px_4px_18px] min-[861px]:top-2 min-[861px]:right-[6%]')}>
                        {bubbles[1]}
                    </p>
                </div>
                {/* What goes wrong */}
                <ul className="m-0 list-none p-0">
                    {items.map((item) => (
                        <li className="flex gap-3 border-t border-[#151313]/18 py-3 text-[15px] text-[#6f6a64]" key={item}>
                            <span aria-hidden="true" className="w-4.5 shrink-0 font-extrabold text-[#b9b3ac]">
                                ✕
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
