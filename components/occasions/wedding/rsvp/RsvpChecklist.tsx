import { Check } from 'lucide-react';

import type { WeddingCardCopy } from '@/lib/occasions/weddingCopy';

type RsvpChecklistProps = { items: WeddingCardCopy[]; pill: string };

// "All the answers": the right column's four points. From 901 px the pill scales with the column.
export function RsvpChecklist({ items, pill }: RsvpChecklistProps) {
    return (
        <div className="[container-type:inline-size] flex flex-col items-stretch">
            <p className="m-0 mt-1.5 mb-3.5 flex items-center self-center rounded-full bg-[#e4f0e1] px-6 py-3 text-[13px] leading-none font-bold tracking-[0.14em] whitespace-nowrap text-[#2a6834] min-[901px]:mt-[4.1cqw] min-[901px]:mb-0 min-[901px]:h-[11.9cqw] min-[901px]:px-[7cqw] min-[901px]:py-0 min-[901px]:text-[4.3cqw]">
                {pill}
            </p>
            <ul className="m-0 list-none rounded-3xl bg-white px-[clamp(14px,1.5vw,22px)] pt-2.5 pb-2 min-[901px]:my-auto">
                {items.map((item) => (
                    <li className="flex items-start gap-3 border-t border-[#151313]/9 py-3.25 first:border-t-0" key={item.title}>
                        <span aria-hidden="true" className="grid size-8.5 flex-none place-items-center rounded-full bg-[#e4f0e1]">
                            <Check className="size-4.25 text-[#2a6834]" strokeWidth={2.6} />
                        </span>
                        <div>
                            <h3 className="mt-0.75 mb-1 [font-family:var(--editorial)] text-[clamp(16px,1.3vw,19px)] leading-[1.15] font-normal tracking-[-0.025em]">
                                {item.title}
                            </h3>
                            <p className="m-0 text-[13.5px] leading-[1.4] text-[#7d776f]">{item.body}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
