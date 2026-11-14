import { useTranslations } from 'next-intl';

import { QrJoinPreview } from '@/components/qrLanding/QrJoinPreview';
import { AppLink } from '@/components/ui/AppLink';

interface QrJoinCardProps {
    choice: 'join' | 'open';
    href: string;
    coverSrc: string | null;
    title: string;
    // Only someone without an account is told that joining makes one.
    showAccountNote: boolean;
}

// The main choice on a scanned event code (KAN-213): what is inside the event, then the button into it.
export function QrJoinCard({ choice, href, coverSrc, title, showAccountNote }: QrJoinCardProps) {
    const t = useTranslations('QrCodePage');

    return (
        <section className="flex flex-col gap-3 rounded-3xl bg-surface-muted p-4">
            {/* Preview */}
            <QrJoinPreview coverSrc={coverSrc} title={title} />

            {/* Line */}
            <p className="text-[13px] leading-snug text-ink-muted">{choice === 'join' ? t('choices.joinLine') : t('choices.eventHint')}</p>

            {/* Action */}
            <AppLink
                href={href}
                className="flex min-h-11 items-center justify-center rounded-full bg-gradient-brand px-5 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
                {choice === 'join' ? t('choices.join') : t('choices.open')}
            </AppLink>
            {showAccountNote ? <p className="-mt-1 text-center text-xs text-ink-muted">{t('choices.freeAccount')}</p> : null}
        </section>
    );
}
