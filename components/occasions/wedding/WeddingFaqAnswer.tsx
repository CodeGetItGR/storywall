type WeddingFaqAnswerProps = {
    answer: string;
    // null: the link's page is off, so the answer stands alone.
    href: string | null;
    label?: string;
};

// An FAQ answer, with its "Learn more →" link when it has one.
export function WeddingFaqAnswer({ answer, href, label }: WeddingFaqAnswerProps) {
    if (!href || !label) return answer;
    return (
        <>
            {answer}{' '}
            <a className="text-inherit underline underline-offset-3 focus-ring" href={href}>
                {label}
                <span aria-hidden="true"> →</span>
            </a>
        </>
    );
}
