'use client';

import { useTranslations } from 'next-intl';

import { InvitationArt } from '@/components/manage/invitation/InvitationArt';
import { AppLink } from '@/components/ui/AppLink';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';

const BUTTON_CLASS = 'inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white';

// The plan doesn't include the invitation: a drawing and the way to add it, before anything is started.
export function InvitationPlanPrompt({ invitation }: { invitation: Pick<EventOnlineInvitation, 'planHref' | 'addOnHref'> }) {
    const t = useTranslations('ManagePage.invitation');
    const tEditor = useTranslations('InvitationEditor');

    return (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
            {/* Illustration */}
            <InvitationArt alt={t('artAlt')} />

            {/* Text */}
            <div className="flex max-w-sm flex-col gap-1">
                <h2 className="text-base font-semibold text-ink">{tEditor('planMissingTitle')}</h2>
                <p className="text-sm text-ink-muted">{t('upgradeBody')}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-2">
                <AppLink href={invitation.planHref} className={BUTTON_CLASS}>
                    {t('upgradePlan')}
                </AppLink>
                {/* Add-on: KAN-82 sets addOnHref and adds its label here. */}
            </div>
        </div>
    );
}
