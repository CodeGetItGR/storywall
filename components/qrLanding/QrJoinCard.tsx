import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { QrJoinPreview } from '@/components/qrLanding/QrJoinPreview';
import { AppLink } from '@/components/ui/AppLink';
import { trackFlow } from '@/lib/flowTracking';

interface QrJoinCardProps {
    choice: 'join' | 'open';
    href: string;
    coverSrc: string | null;
    title: string;
    // A guest without an account: sign-up and log-in in place of Join, both carrying the event's invite.
    accountHrefs: { register: string; login: string } | null;
    // Buttons in place of the card's own (the demo's plans and way back).
    actions?: ReactNode;
}

// Counted like the invite page's buttons.
function handleChooseRegister() {
    trackFlow({ name: 'Invite Choice', choice: 'register' });
}

function handleChooseLogin() {
    trackFlow({ name: 'Invite Choice', choice: 'login' });
}

export const QR_JOIN_PRIMARY_CLASS =
    'flex min-h-10 items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90';
// Log-in is a plain link under the main button, so the card stays short. The negative margin keeps
// its tap area full height without the extra space showing above and below it.
export const QR_JOIN_LINK_CLASS =
    'mx-auto -my-2.5 inline-flex min-h-10 items-center px-3 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink';

// The main choice on a scanned event code (KAN-213): what is inside the event, then the way in.
export function QrJoinCard({ choice, href, coverSrc, title, accountHrefs, actions }: QrJoinCardProps) {
    const t = useTranslations('QrCodePage');
    const tInvite = useTranslations('InviteOnboardingPage');
    const showAccountButtons = choice === 'join' && accountHrefs !== null;

    return (
        <section className="flex flex-col gap-3 rounded-3xl bg-surface-muted p-4">
            {/* Preview */}
            <QrJoinPreview coverSrc={coverSrc} title={title} />

            {/* Line */}
            <p className="text-center text-[13px] leading-snug text-ink-muted">
                {choice === 'join' ? t('choices.joinLine') : t('choices.eventHint')}
            </p>

            {/* Actions */}
            {actions ? (
                actions
            ) : showAccountButtons ? (
                <>
                    <AppLink href={accountHrefs.register} onClick={handleChooseRegister} className={QR_JOIN_PRIMARY_CLASS}>
                        {tInvite('createAccount')}
                    </AppLink>
                    <p className="-mt-1 text-center text-xs text-ink-muted">{t('choices.freeAccount')}</p>
                    <AppLink href={accountHrefs.login} onClick={handleChooseLogin} className={QR_JOIN_LINK_CLASS}>
                        {tInvite('haveAccount')}
                    </AppLink>
                </>
            ) : (
                <AppLink href={href} className={QR_JOIN_PRIMARY_CLASS}>
                    {choice === 'join' ? t('choices.join') : t('choices.open')}
                </AppLink>
            )}
        </section>
    );
}
