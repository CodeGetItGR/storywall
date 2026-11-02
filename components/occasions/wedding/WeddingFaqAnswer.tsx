import { qrLinkAttributes } from '@/lib/linkClicks';

type WeddingFaqAnswerProps = {
    answer: string;
    // null: the link's page is off, so the answer stands alone.
    href: string | null;
    label?: string;
    // A link to the QR page counts its clicks.
    toQrPage?: boolean;
};

// An FAQ answer, with its "Learn more →" link when it has one.
export function WeddingFaqAnswer({ answer, href, label, toQrPage = false }: WeddingFaqAnswerProps) {
    if (!href || !label) return answer;
    return (
        <>
            {answer}{' '}
            <a className="text-inherit underline underline-offset-3 focus-ring" href={href} {...(toQrPage ? qrLinkAttributes('faq') : {})}>
                {label}
                <span aria-hidden="true"> →</span>
            </a>
        </>
    );
}
