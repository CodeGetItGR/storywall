'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { Modal } from '@/components/ui/modal';
import type { PublishSignInState } from '@/hooks/usePublishInvitation';

type PublishSignInDialogProps = {
    signIn: PublishSignInState;
    // What signing in is for; publishing by default.
    title?: string;
};

// A visitor edits signed out and signs in to publish or to add photos. The draft stays in this browser meanwhile.
export function PublishSignInDialog({ signIn, title }: PublishSignInDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={signIn.open} onClose={signIn.close} size="sm" closeLabel={t('close')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <div className="flex flex-col gap-5">
                    {/* Message */}
                    <div className="flex items-start gap-3 pr-8">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-ink">
                            <LogIn className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-semibold text-ink">{title ?? t('signInTitle')}</h2>
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('signInBody')}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                        <AppLink
                            href={signIn.registerHref}
                            className="inline-flex min-h-11 items-center rounded-full bg-surface-muted px-4 font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('createAccount')}
                        </AppLink>
                        <AppLink
                            href={signIn.loginHref}
                            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-semibold text-white transition-colors hover:bg-ink/90"
                        >
                            {t('signIn')}
                        </AppLink>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}
