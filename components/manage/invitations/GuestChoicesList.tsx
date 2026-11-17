'use client';

import { Camera, type LucideIcon, Mail, PenLine, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { InvitationChoiceStatus } from '@/components/manage/invitations/InvitationChoiceStatus';
import type { EventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import type { GuestChoiceRow } from '@/lib/invitationsQr';

// Each row's icon, and its title and line on the scan page (QrCodePage keys).
const ROWS: Record<GuestChoiceRow, { icon: LucideIcon; title: string; line: string | null }> = {
    join: { icon: Users, title: 'choices.join', line: 'choices.eventHint' },
    invitation: { icon: Mail, title: 'choices.invitation', line: null },
    upload: { icon: Camera, title: 'guestCode.uploadButton', line: 'choices.uploadLine' },
    wish: { icon: PenLine, title: 'guestCode.wishButton', line: 'choices.wishLine' },
};

// "What guests see": what scanning the event's code offers, with the invitation's status and actions on its row.
// The invitation row needs the host's invitation, so it is left out without one.
export function GuestChoicesList({ rows, invitation }: { rows: GuestChoiceRow[]; invitation: EventOnlineInvitation | null }) {
    const t = useTranslations('ManagePage.invitationsQr');
    const tScan = useTranslations('QrCodePage');

    return (
        <section aria-labelledby="guest-choices-heading" className="flex flex-col gap-1.5">
            {/* Header */}
            <h2 id="guest-choices-heading" className="text-[17px] font-bold text-ink">
                {t('guestsSee')}
            </h2>

            {/* Choices */}
            <ul>
                {rows.map((row) => {
                    if (row === 'invitation' && !invitation) return null;
                    const { icon: Icon, title, line } = ROWS[row];

                    return (
                        <li key={row} className="flex flex-col gap-2.5 border-t border-border py-3">
                            {/* Choice */}
                            <div className="flex items-center gap-3">
                                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="text-[15px] font-bold text-ink">{tScan(title)}</span>
                                    {line && <span className="text-[13px] text-ink-muted">{tScan(line)}</span>}
                                </span>
                            </div>

                            {/* Invitation status */}
                            {row === 'invitation' && invitation && (
                                <div className="pl-[50px]">
                                    <InvitationChoiceStatus invitation={invitation} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
