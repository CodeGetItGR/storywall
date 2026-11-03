'use client';

import { useDisclosure } from '@/hooks/useDisclosure';

type FaqItemProps = { question: string; answer: string };

// One question; tapping it opens or closes its answer.
export function FaqItem({ question, answer }: FaqItemProps) {
    const { open, toggle } = useDisclosure();

    return (
        <div className="faq-item">
            {/* Question */}
            <button type="button" className="faq-q" aria-expanded={open} onClick={toggle}>
                <span>{question}</span>
                <span className="faq-q-right">
                    <svg className={open ? 'faq-chevron open' : 'faq-chevron'} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>
            {/* Answer */}
            <div className={open ? 'faq-a open' : 'faq-a'}>{answer}</div>
        </div>
    );
}
