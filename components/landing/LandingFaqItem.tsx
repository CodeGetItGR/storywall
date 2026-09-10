type LandingFaqItemProps = {
    answer: string;
    index: number;
    question: string;
};

export function LandingFaqItem({ answer, index, question }: LandingFaqItemProps) {
    return (
        <details className="swfaq-editorial-item">
            <summary>
                <span className="swfaq-editorial-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="swfaq-editorial-question">{question}</span>
                <span aria-hidden="true" className="swfaq-editorial-icon">
                    +
                </span>
            </summary>
            <div className="swfaq-editorial-answer">{answer}</div>
        </details>
    );
}
