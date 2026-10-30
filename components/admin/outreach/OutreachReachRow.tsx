'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OutreachCopyButton } from '@/components/admin/outreach/OutreachCopyButton';
import type { ReachChannel } from '@/lib/adminOutreach';

export function OutreachReachRow({
    channel,
    copied,
    onCopyAction,
}: {
    channel: ReachChannel;
    copied: boolean;
    onCopyAction: (key: string, text: string) => Promise<void>;
}) {
    const t = useTranslations('AdminPage.outreach.reach');
    // Mail and phone links open an app; the others open a new tab.
    const opensPage = channel.key !== 'email' && channel.key !== 'phone';

    function handleCopy() {
        void onCopyAction(channel.key, channel.copyText);
    }

    return (
        <li className="flex items-center gap-3 px-3 py-2.5">
            {/* Channel */}
            <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t(channel.key)}</span>
                {channel.href ? (
                    <a
                        href={channel.href}
                        target={opensPage ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-ink underline-offset-2 hover:underline"
                    >
                        <span className="truncate">{channel.label}</span>
                        {opensPage && <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-faint" />}
                    </a>
                ) : (
                    <span className="block truncate text-sm font-semibold text-ink">{channel.label}</span>
                )}
            </span>

            {/* Copy */}
            <OutreachCopyButton label={t('copy')} copied={copied} onCopyAction={handleCopy} />
        </li>
    );
}
