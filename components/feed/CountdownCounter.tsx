export function CountdownCounter({ text, shortText, count }: { text: string; shortText: string; count: number }) {
    return (
        <div className="flex min-w-6 flex-col items-center" aria-label={`${count} ${text}`}>
            <span className="abhaya-body text-[1.4rem] leading-none font-bold text-black tabular-nums xxs:text-[1.55rem] xs:text-[1.75rem] sm:text-[1.95rem] md:text-[2.1rem] lg:text-[1.75rem]">
                {count}
            </span>
            <span className="alegreya text-[1.05rem] leading-none text-black/60 xxs:text-[1.1rem] xs:text-[1.2rem] sm:text-[1.35rem] md:text-[1.1rem]">
                {shortText}
            </span>
        </div>
    );
}
