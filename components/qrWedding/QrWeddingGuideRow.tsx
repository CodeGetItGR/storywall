import type { ReactNode } from 'react';

// One guide question: the question as an h2, the answer beside it from desktop up.
export function QrWeddingGuideRow({ children, title }: { children: ReactNode; title: string }) {
    return (
        <article className="grid gap-4 border-t border-[#151313]/[0.13] py-9 min-[761px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[761px]:gap-[5vw] min-[761px]:py-12">
            <h2 className="m-0 font-[Baskerville,Georgia,serif] text-[32px] leading-[1.02] font-normal tracking-[-0.04em] text-balance min-[761px]:text-[clamp(34px,3vw,48px)]">
                {title}
            </h2>
            <div className="text-[16px] leading-[1.55] min-[761px]:pt-2 min-[761px]:text-[18px]">{children}</div>
        </article>
    );
}
