export function CountdownCounter({ text, shortText, count }: { text: string; shortText: string; count: number }) {
    return (
        <div className="flex min-w-6 flex-col items-center" aria-label={`${count} ${text}`}>
            <span className="abhaya-body text-[1.05rem] font-bold tabular-nums leading-none text-black xs:text-[1.3rem] sm:text-[1.45rem]">
                {count}
            </span>
            <span className="alegreya text-[0.65rem] leading-none text-black/60 xxs:text-[0.8rem] sm:text-[0.95rem]">{shortText}</span>
        </div>
    );
}
