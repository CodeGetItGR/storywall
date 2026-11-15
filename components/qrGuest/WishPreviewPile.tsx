import { useTranslations } from 'next-intl';

interface WishPreviewPileProps {
    message: string;
    guestName: string;
}

// The wish as it will read in the wishbook, on top of a small pile of pages. It fills in as the guest
// types; until then it shows the field labels, faded. Hidden from screen readers: it repeats the fields.
export function WishPreviewPile({ message, guestName }: WishPreviewPileProps) {
    const t = useTranslations('QrCodePage');
    const text = message.trim();
    const name = guestName.trim();

    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-64">
            {/* Pile */}
            <div className="absolute inset-0 translate-x-2 translate-y-2.5 rotate-[5deg] rounded-[1rem] bg-primary/20" />
            <div className="absolute inset-0 -translate-x-1.5 translate-y-1 -rotate-[4deg] rounded-[1rem] bg-primary-light" />

            {/* Top page */}
            <div className="relative flex min-h-28 flex-col rounded-[1rem] border border-border bg-background px-4 pt-3.5 pb-3 shadow-xs">
                <p
                    className={
                        text
                            ? 'line-clamp-4 font-editorial text-[15px] leading-relaxed break-words text-ink italic'
                            : 'font-editorial text-[15px] leading-relaxed text-ink-faint italic'
                    }
                >
                    {text || t('guestCode.wish.messageLabel')}
                </p>
                <p className={`mt-auto truncate pt-2 text-right text-xs ${name ? 'text-ink-muted' : 'text-ink-faint'}`}>
                    — {name || t('guestCode.wish.nameLabel')}
                </p>
            </div>
        </div>
    );
}
