export function CountdownCounter({ text, shortText, count }: { text: string; shortText: string; count: number }) {
    return (
        <div className="flex min-w-6 flex-col items-center" aria-label={`${count} ${text}`}>
            <span className="abhaya-body text-[1.2rem] font-bold tabular-nums leading-none text-black xs:text-[1.5rem] sm:text-[1.65rem]">
                {count}
            </span>
            <span className="alegreya text-[1rem] leading-none text-black/60 xxs:text-[1.2rem] sm:text-[1.1rem]">{shortText}</span>
        </div>
    );
}
