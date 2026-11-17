import { useTranslations } from 'next-intl';

import { QrJoinPreview } from '@/components/qrLanding/QrJoinPreview';
import { AppLink } from '@/components/ui/AppLink';

interface QrJoinCardProps {
    choice: 'join' | 'open';
    href: string;
    coverSrc: string | null;
    title: string;
    // A guest without an account: sign-up and log-in in place of Join, both carrying the event's invite.
    accountHrefs: { register: string; login: string } | null;
}

const PRIMARY_CLASS =
    'flex min-h-10 items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90';
// Log-in is a plain link under the main button, so the card stays short.
const LINK_CLASS =
    'mx-auto inline-flex min-h-10 items-center px-3 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink';

// The main choice on a scanned event code (KAN-213): what is inside the event, then the way in.
export function QrJoinCard({ choice, href, coverSrc, title, accountHrefs }: QrJoinCardProps) {
    const t = useTranslations('QrCodePage');
    const tInvite = useTranslations('InviteOnboardingPage');
    const showAccountButtons = choice === 'join' && accountHrefs !== null;

    return (
        <section className="flex flex-col gap-3 rounded-3xl bg-surface-muted p-4">
            {/* Preview */}
            <QrJoinPreview coverSrc={coverSrc} title={title} />

            {/* Line */}
            <p className="text-center text-[13px] leading-snug text-ink-muted">{choice === 'join' ? t('choices.joinLine') : t('choices.eventHint')}</p>

            {/* Actions */}
            {showAccountButtons ? (
                <>
                    <AppLink href={accountHrefs.register} className={PRIMARY_CLASS}>
                        {tInvite('createAccount')}
                    </AppLink>
                    <p className="-mt-1 text-center text-xs text-ink-muted">{t('choices.freeAccount')}</p>
                    <AppLink href={accountHrefs.login} className={LINK_CLASS}>
                        {tInvite('haveAccount')}
                    </AppLink>
                </>
            ) : (
                <AppLink href={href} className={PRIMARY_CLASS}>
                    {choice === 'join' ? t('choices.join') : t('choices.open')}
                </AppLink>
            )}
        </section>
    );
}
