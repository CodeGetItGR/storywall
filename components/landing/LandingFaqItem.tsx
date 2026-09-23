type LandingFaqItemProps = {
    answer: string;
    index: number;
    question: string;
};

export function LandingFaqItem({ answer, index, question }: LandingFaqItemProps) {
    return (
        <details className="group border-b border-[rgb(21_19_19/20%)]">
            <summary className="group/summary grid min-h-[62px] cursor-pointer list-none grid-cols-[32px_minmax(0,1fr)_28px] items-center gap-2.5 py-3.5 min-[761px]:min-h-[68px] min-[761px]:grid-cols-[44px_minmax(0,1fr)_30px] min-[761px]:gap-3.5 min-[761px]:py-[17px] [&::-webkit-details-marker]:hidden">
                <span className="[font-family:var(--editorial)] text-lg leading-none tracking-[-0.04em] text-[#151313] transition-colors duration-300 group-open:text-[#d87d8f] group-hover/summary:text-[#d87d8f] min-[761px]:text-[22px]">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <span className="[font-family:var(--editorial)] text-[clamp(21px,6vw,26px)] leading-[1.18] font-normal tracking-[-0.025em] min-[761px]:text-[clamp(23px,1.8vw,30px)] min-[761px]:leading-[1.14] min-[761px]:tracking-[-0.028em]">
                    {question}
                </span>
                <span
                    aria-hidden="true"
                    className="flex size-[27px] items-center justify-center rounded-full border border-[rgb(21_19_19/34%)] [font-family:Arial,Helvetica,sans-serif] text-[15px] leading-none transition-[transform,background,color] duration-[320ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-open:rotate-45 group-open:bg-[#151313] group-open:text-white group-hover/summary:scale-[1.06] min-[761px]:size-[29px] min-[761px]:text-base"
                >
                    +
                </span>
            </summary>
            <div className="ml-[42px] max-w-[960px] pt-0.5 pr-5 pb-5 text-[13px] leading-[1.5] min-[761px]:ml-[58px] min-[761px]:pr-[42px] min-[761px]:pb-6 min-[761px]:text-sm min-[761px]:leading-[1.55]">
                {answer}
            </div>
        </details>
    );
}
